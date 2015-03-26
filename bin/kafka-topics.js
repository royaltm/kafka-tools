#!/usr/bin/env node
/*
 * TOOL kafka topic helper
 *
 * Author: Rafal Michalski (c) 2015
 *
 * Usage:
 *
 * kafka-topics [topic-name [[group-id] offset]]
 *
*/
require('colors');
var assert = require('assert');
var numeral = require('numeral');
var kafka_tools = require('../index.js')
  , thousands = kafka_tools.thousands
  , pad       = kafka_tools.pad;
var kafka = require('kafka-node');

var connectionString = process.env.ADVERTINE_KAFKA_SERVER || 'kafka.advertine.com:2181/kafka081';
var clientId = 'advertine-kafka-topics';
var clientOptions = {
                      sessionTimeout: 5000,
                      spinDelay : 500,
                      retries : 0
                    };

numeral.language('pl', {
    delimiters: {
        thousands: "'",
        decimal: ','
    }
});

// switch between languages
numeral.language('pl');

var client = new kafka.Client(connectionString, clientId, clientOptions);

var args = process.argv.slice(2);

console.log('Kafka: ' + connectionString.green);

function showUsageAndExit() {
  console.log("Usage:");
  console.log("  kafka-topics topic-name [[group-id] offset]")
  console.log("               offset - set offset to (boundaries are checked)");
  showBrokersAndExit();
}

function showBrokersAndExit() {
  console.log("\nBrokers: ");
  client.zk.listBrokers(function(brokers) {
    Object.keys(brokers).forEach(function(no) {
      var brokerInfo = brokers[no]
      console.log("%d: %s:%s ts: %s ver: %d", no, 
        brokerInfo.host.green, String(brokerInfo.port).magenta,
        new Date(parseInt(brokerInfo.timestamp)).toISOString().cyan,
        brokerInfo.version);
    });
    console.log('');
    showTopicsAndExit();
  });
}

function showTopicsAndExit() {
  client.zk.listTopics(function(err, topics) {
    assert.ifError(err);
    
    console.log("Topics:");
    var padlen = topics.reduce(function(max, topic) {
      return topic.name.length > max ? topic.name.length : max}, 0);
    topics.forEach(function(topic) {
      var partitions = Object.keys(topic.partitions);
      var numPartitions = partitions.length
        , replication = topic.partitions[partitions[0]].length
      console.log("%s (part: %s repl: %s ver: %s)",
        pad(topic.name, padlen).yellow, numPartitions, replication, topic.version);
      // for(var partition in topic.partitions) {
      //   console.log("  Partition: %s %s ", partition, topic.partitions[partition].join(','));
      // };
    });
    process.exit();
  });
}

if (args.length < 1) {

  showUsageAndExit();

} else {

  var topic = args[0];

  client.topicExists([topic], function(err) {
    if (err) {
      console.log(err.message.red);
      process.exit(1);
    }

    showOffsets(topic, new kafka.Offset(client));
  });
}

function getPartitions(topic, callback) {
  var partitions = client.topicPartitions[topic];
  if (partitions)
    return callback(null, partitions);
  client.refreshMetadata([topic], function(err) {
    if (err) {
      callback(err);
    } else
      callback(null, client.topicPartitions[topic]);
  });
}

function showOffsets(topic, offset) {
  getPartitions(topic, function(err, partitions) {

    assert.ifError(err);

    var payloads = partitions.map(function(partition) {
      return { topic: topic, partition: partition, time: -2, maxNum: 1 };
    });

    offset.fetch(payloads, function (err, data) {

      assert.ifError(err);

      payloads.forEach(function(payload) {
        payload.time = -1;
      });

      offset.fetch(payloads, function (err, data2) {

        assert.ifError(err);

        console.log("Topic: " + topic.yellow);

        if (args.length < 2) {
          partitions.forEach(function(partition) {
            var min = data[topic][partition][0], max = data2[topic][partition][0]
            console.log("Partition %s: %s - %s buf: %s",
              pad(partition, partitions.length < 10 ? 1 : 2),
              thousands(min), thousands(max),
              thousands(max - min).cyan);
          });

          showTopicGroups(topic);

        } else {

          if (args[1] === '--delete') {
            console.log('Attempting to delete topic....'.red);
            client.zk.deleteTopics([topic], function(err, stat) {
              assert.ifError(err);
              console.log('No errors, but will it work?'.grey);
            });
          } else {

            showGroupId(topic, offset, partitions, args[1], data, data2);

          }

        }
      });
    });
  });
}

function showTopicGroups(topic) {
  client.zk.listGroupsPerTopic(topic, function(err, groupNames) {
      assert.ifError(err);

      if (groupNames.length) {
        console.log("Groups: ");

        groupNames.forEach(function(name) {
          console.log("  %s", name.cyan);
        });
      } else {
        console.log("Groups: %s", 'none'.grey);
      }

      process.exit();
  });
}

function showGroupId(topic, offset, partitions, groupId, mins, maxs) {
  var payloads = partitions.map(function(partition) {
    return { topic: topic, partition: partition };
  });
  offset.fetchCommits(groupId, payloads, function (err, data) {

    assert.ifError(err);

    console.log("Group ID: " + groupId.cyan);

    if (args.length >= 3) {
      var setTo = parseInt(args[2]);
      if (! isNaN(setTo))
        return setGroupId(topic, offset, setTo, partitions, groupId, mins, maxs, data);
    }

    partitions.forEach(function(partition) {
      var min = mins[topic][partition][0]
        , max = maxs[topic][partition][0]
        , cur = data[topic][partition]
        , buf = (max - min)
        , lag = max - cur
        , perc = lag / buf
        ;
      console.log("Partition %s: %s - %s ofs: %s lag: %s%% %s",
        pad(partition, partitions.length < 10 ? 1 : 2),
        thousands(min), thousands(max),
        thousands(cur).magenta,
        pad((perc*100).toFixed(0), 3),
        thousands(max - cur).red);
    });

    process.exit();

  });
}

function setGroupId(topic, offset, setTo, partitions, groupId, mins, maxs, curs) {
  var payloads = partitions.map(function(partition) {
    var value = setTo;
    if (value < mins[topic][partition][0])
      value = mins[topic][partition][0];
    if (value > maxs[topic][partition][0])
      value = maxs[topic][partition][0];
    return { topic: topic, partition: partition, offset: value };
  });

  offset.commit(groupId, payloads, function(err, data) {
    assert.ifError(err);

    partitions.forEach(function(partition) {
      var min = mins[topic][partition][0]
        , max = maxs[topic][partition][0]
        , cur = curs[topic][partition]
        ;
      console.log("Partition %s: %s - %s ofs: %s -> %s",
        pad(partition, partitions.length < 10 ? 1 : 2),
        thousands(min), thousands(max),
        thousands(cur).magenta,
        thousands(payloads[partition|0].offset).green);
    });

    process.exit();
  });

}
