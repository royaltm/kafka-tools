#!/usr/bin/env node
/*
 * TOOL kafka topic helper
 *
 * Author: Rafal Michalski (c) 2015-2016
 *
 * Usage:
 *
 * kafka-topics [topic-name [[group-id] offset]]
 *
*/
require('colors');
var assert = require('assert');
var os = require('os');
var numeral = require('numeral');
var kafka_tools = require('../index.js')
  , logconfig = kafka_tools.logconfig
  , thousands = kafka_tools.thousands
  , pad       = kafka_tools.pad

var kafka = require('kafka-node');


var connectionString = process.env.KAFKA_TOOLS_ZOOKEEPER || 'localhost:2181/';
var clientId = 'kafka-topics';
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

var propertyAssignmentPattern = /^([a-z][a-z\.]+)\=(.*)$/;

var client = new kafka.Client(connectionString, clientId, clientOptions);

var args = process.argv.slice(2);

console.log('Kafka: ' + connectionString.green);

function showVersionAndExit() {
  var pkg = require("../package.json");
  console.log("kafka-topics: v%s", pkg.version);
  process.exit();
}

function showUsageAndExit() {
  console.log([
    "Usage:",
    "  kafka-topics -v|--version",
    "               display program version",
    "",
    "  kafka-topics",
    "               lists topics",
    "",
    "  kafka-topics topic-name group-id",
    "               lists topic partition offsets and group offsets",
    "",
    "  kafka-topics topic-name group-id offset [offset2 ...]",
    "               offset - sets offset to (boundaries are checked)",
    "               multiple offsets will be cycled for each partition in topic",
    "",
    "  kafka-topics --create topic-name p<numPartitions> r<numReplicas> \\",
    "                                   [config.to.override=value ...]",
    "               create topic with topic-name and numPartitions partitions",
    "               and numReplicas replication factor",
    "               and possible config overrides",
    "",
    "  kafka-topics -c|--config",
    "               list possible configuration overrides with descriptions",
    "",
    "  kafka-topics topic-name -c|--config config.to.override=value config.to.delete=",
    "               overrides or removes config overrides for topic",
    "",
    "  kafka-topics topic-name --delete",
    "               deletes topic",
    "               (delete.topic.enable must be \"true\" on kafka server)",
    "",
    "  kafka-topics topic-name --clear",
    "               clears topic, may take a while",
    "important".red + ": " + "do not write messages or modify topic configuration override while the topic is being cleared".underline
  ].join(os.EOL));
  process.exit();
}

function showBrokersAndExit() {
  console.log("\nBrokers: ");
  client.zk.listBrokers(function(brokers) {
    Object.keys(brokers).forEach(function(no) {
      var brokerInfo = brokers[no]
      console.log("%d" + ":".grey + " %s" + ":".grey + "%s ts" + ":".grey + " %s ver" + ":".grey + " %d", no,
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
    
    console.log("Topics:\n" + "part repl ver name".grey);
    var padlen = topics.reduce(function(max, topic) {
      return topic.name.length > max ? topic.name.length : max}, 0);
    topics.forEach(function(topic) {
      var partitions = Object.keys(topic.partitions);
      var numPartitions = partitions.length
        , replication = topic.partitions[partitions[0]].length
      console.log("%s %s %s %s",
        pad(numPartitions, 4), pad(replication, 4), pad(topic.version, 3), String(topic.name || '').yellow);
      // for(var partition in topic.partitions) {
      //   console.log("  Partition: %s %s ", partition, topic.partitions[partition].join(','));
      // };
    });
    process.exit();
  });
}

if (args.length < 1) {

  showBrokersAndExit();

} else {

  if (args[0] && args[0].match(/^-?-v(?:ersion)?$/i)) {

    return showVersionAndExit();

  } else if (args[0] && args[0].match(/^-?-h(?:elp)?$/i)) {

    return showUsageAndExit();

  } else if (args[0] && args[0].match(/^-c$|^--config$/)) {

    logconfig.list();
    process.exit();

  } else if (args[0] === '--create') {

    return createTopicAndExit(args.slice(1));

  }

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

function showTopicConfig(topic, callback) {
  client.zk.getTopicConfig(topic, function(err, config) {

    assert.ifError(err);

    if ( ! isEmpty(config = config.config) ) {
      console.log("Config:");
      for(var name in config) {
        console.log('  %s', configFormatted(name, config[name]));
      }
    }

    callback();
  });
}

function getOffsets(topic, offset, next) {
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

        next(topic, offset, partitions, data, data2);
      });
    });
  });
}

function showOffsets(topic, offset) {
  getOffsets(topic, offset, function(topic, offset, partitions, data, data2) {
    console.log("Topic: " + topic.yellow);

    if (args.length < 2) {
      partitions.forEach(function(partition) {
        var min = data[topic][partition][0], max = data2[topic][partition][0]
        console.log("Partition %s" + ":".grey + " %s " + "-".grey + " %s " + "buf:".grey + " %s",
          pad(partition, String(partitions.length - 1).length),
          thousands(min), thousands(max),
          thousands(max - min).cyan);
      });

      showTopicConfig(topic, function() { showTopicGroups(topic) });

    } else {

      if (args[1] === '--delete') {
        console.log('Attempting to delete topic....'.red);
        client.zk.deleteTopics([topic], function(err, topics) {
          assert.ifError(err);
          console.log('No errors, but will it work?'.grey);
          process.exit();
        });
      } else if (args[1] === '--clear') {

        clearTopic(topic, offset);

      } else if (args[1] === '-c' || args[1] === '--config') {

        configureTopic(topic, args.slice(2));

      } else {

        showGroupId(topic, offset, partitions, args[1], data, data2);

      }

    }
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
    var setTo;
    if (args.length >= 3) {
      if (args.length > 3) {
        setTo = args.slice(2).map(function(i){return parseInt(i)});
        if (!setTo.some(isNaN))
          return setGroupId(topic, offset, setTo, partitions, groupId, mins, maxs, data);
      } else {
        setTo = parseInt(args[2]);
        if ( ! isNaN(setTo) )
          return setGroupId(topic, offset, setTo, partitions, groupId, mins, maxs, data);
      }
    }

    partitions.forEach(function(partition) {
      var min = mins[topic][partition][0]
        , max = maxs[topic][partition][0]
        , cur = data[topic][partition]
        , buf = (max - min)
        , lag = max - cur
        , perc = lag / buf
        ;
      console.log("Partition %s" + ":".grey + " %s " + "-".grey + " %s " + "ofs:".grey + " %s " + "lag:".grey + " %s%% %s",
        pad(partition, String(partitions.length - 1).length),
        thousands(min), thousands(max),
        thousands(cur).magenta,
        pad((perc*100).toFixed(0), 3),
        thousands(max - cur).red);
    });

    process.exit();

  });
}

function setGroupId(topic, offset, setTo, partitions, groupId, mins, maxs, curs) {
  var payloads = partitions.map(function(partition, index) {
    var value = Array.isArray(setTo) ? setTo[index % setTo.length] : setTo;
    if (value < 0)
      value += maxs[topic][partition][0];
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
      console.log("Partition %s" + ":".grey + " %s " + "-".grey + " %s " + "ofs:".grey + " %s " + "->".grey + " %s",
        pad(partition, String(partitions.length - 1).length),
        thousands(min), thousands(max),
        thousands(cur).magenta,
        thousands(payloads[partition|0].offset).green);
    });

    process.exit();
  });

}

function configureTopic(topic, confargs) {
  var configs = parseConfArgs(confargs);

  if (isEmpty(configs)) {
    logconfig.list();
    process.exit();
  }

  client.zk.getTopicConfig(topic, function(err, current) {

    assert.ifError(err);

    current = current && current.config || {};

    console.log("Config:")

    for(var name in configs) {
      var value = configs[name];
      if (value == null) {
        console.log("  removing %s", name.red);
        delete current[name];
      } else {
        console.log("  override %s", configFormatted(name, value));
        current[name] = value;
      }
    }

    client.zk.changeTopicConfig(topic, current, function(err) {

      assert.ifError(err);

      process.exit();
    });
  });

}

function clearTopic(topic, offset) {
  client.zk.getTopicConfig(topic, function(err, current) {
    assert.ifError(err);

    current = current && current.config || {};

    var oldRetentionMs = current['retention.ms'];
    var oldCleanupPolicy = current['cleanup.policy']
    current['retention.ms'] = '1';
    current['cleanup.policy'] = 'delete';

    process.stdout.write("Clear in progress ..");

    client.zk.changeTopicConfig(topic, current, function(err) {
      assert.ifError(err);

      if (oldRetentionMs) {
        current['retention.ms'] = oldRetentionMs;
      } else {
        delete current['retention.ms'];
      }
      if (oldCleanupPolicy) {
        current['cleanup.policy'] = oldCleanupPolicy;
      } else {
        delete current['cleanup.policy'];
      }
      waitBufferCleared(topic, offset, function() {
        console.log("Done.");
        client.zk.changeTopicConfig(topic, current, function(err) {
          assert.ifError(err);
          process.exit();
        });
      });

    });
  });

}

function waitBufferCleared(topic, offset, next) {
  setTimeout(function() {

    process.stdout.write('.');

    getOffsets(topic, offset, function(topic, offset, partitions, data, data2) {
      if (partitions.every(function(partition) {
        var min = data[topic][partition][0], max = data2[topic][partition][0]
        return max - min <= 0;
      })) {
        console.log("");
        next(topic, offset);
      } else {
        waitBufferCleared(topic, offset, next);
      }
    });
  }, 2000);
}

function createTopicAndExit(createargs) {
  if (createargs.length < 3)
    return showUsageAndExit();

  var topic = createargs[0];

  var numPartitions = createargs[1];
  var replicationFactor = createargs[2];

  if (numPartitions.charAt(0) !== 'p' || replicationFactor.charAt(0) !== 'r')
    return showUsageAndExit();

  numPartitions = parseInt(numPartitions.substr(1));
  replicationFactor = parseInt(replicationFactor.substr(1));

  console.log("Topic: " + topic.yellow);

  configs = parseConfArgs(createargs.slice(3));

  client.zk.createTopic(topic, numPartitions, replicationFactor, configs, function(err, replicaAssignment) {
    if (err) {
      console.log(err.toString().red);
      process.exit(1);
    }
    console.log("Created with:")
    replicaAssignment.forEach(function(repl, partitionId) {
      console.log("  Partition %s" + ":".grey + " on brokers %s ",
          pad(partitionId, String(numPartitions - 1).length),
          repl.join());
    });
    if (!isEmpty(configs)) {
      console.log("  Config:");
      for(var name in configs) {
        console.log('    %s', configFormatted(name, configs[name]));
      }
    }
    process.exit();
  });
}

function configFormatted(name, value) {
  return '"'.grey + name.magenta + '": "'.grey + value.underline + '"'.grey;
}

function parseConfArgs(args) {
  var config = {};

  if (Array.isArray(args)) {
    args.forEach(function(arg) {
      var match = arg.match(propertyAssignmentPattern);
      if (match) {
        var value = match[2].trim();
        config[match[1]] = value ? value : null;
      } else {
        return;
      }
    });
  }
  return config;
};

function isEmpty(object) {
  if ("string" === typeof object) return !object;
  for(var i in object) return false;
  return true;
}
