var isNumber = require('util').isNumber;

var debug = require('debug')('kafka-node:zookeeper');

var async = require('async');
var Zookeeper = require('kafka-node/lib/zookeeper').Zookeeper;
var zookeeper = require('node-zookeeper-client');

var Topic = require('../index').Topic;

var NO_NODE = zookeeper.Exception.NO_NODE;
var NODE_EXISTS = zookeeper.Exception.NODE_EXISTS;

var PERSISTENT_SEQUENTIAL = zookeeper.CreateMode.PERSISTENT_SEQUENTIAL;

var logconfig = require('./logconfig');

var BrokerTopicsPath = "/brokers/topics";
var BrokerTopicsPrefix = BrokerTopicsPath + '/';

var ConsumersPath = "/consumers";
var ConsumersPrefix = ConsumersPath + '/';
var OffsetsSufffix = "/offsets"

var TopicConfigPrefix = "/config/topics/";
var TopicConfigChangesPrefix = "/config/changes/config_change_";

var DeleteTopicsPrefix = "/admin/delete_topics/";

function getTopicPath(topic) {
  return BrokerTopicsPrefix + topic;
}

function getDeleteTopicPath(topic) {
  return DeleteTopicsPrefix + topic;
}

function getGroupOffsetsPath(name) {
  return ConsumersPrefix + name + OffsetsSufffix;
}

function getTopicConfigPath(topic) {
  return TopicConfigPrefix + topic;
}

Zookeeper.prototype.listTopics = function(callback) {
  var that = this;
  this.client.getChildren(
    BrokerTopicsPath,
    function (err, topicNames) {
      if (err) return callback(err);
      topicNames.sort();
      async.map(topicNames, function(name, next) {
        that.client.getData(
          getTopicPath(name),
          function(err, data) {
            if (err)
              return next(err);
            var topic = JSON.parse(data.toString());
            topic.name = name;
            next(null, topic);
          }
        );
      }, callback);
    }
  );
};

Zookeeper.prototype.listGroupsPerTopic = function(topic, callback) {
  var that = this;
  var groups = [];
  this.client.getChildren(
    ConsumersPath,
    function (err, groupNames) {
      if (err) return callback(err);
      async.each(groupNames, function(name, next) {
        that.client.getChildren(
          getGroupOffsetsPath(name),
          function(err, topics) {
            if (err) {
              if (err.code !== NO_NODE)
                return next(err);
            } else if (~topics.indexOf(topic)) {
              groups.push(name);
            }
            next();
          }
        );
      }, function(err) {
        if (err)
          return callback(err);
        callback(null, groups.sort());
      });
    }
  );
};

Zookeeper.prototype.getTopicConfig = function(topic, callback) {
  var that = this;
  var configPath = getTopicConfigPath(topic);
  this.client.getData(
    configPath,
    function(err, data) {
      if (err)
        return callback(err);
      callback(null, JSON.parse(data.toString()));
    }
  );
};

/**
 * Delete topic
 * 
 * @param {string|Array{String}} topics
 * @param {Function} callback
**/
Zookeeper.prototype.deleteTopics = function(topics, callback) {
  if ( ! Array.isArray(topics) )
    topics = [topics];
  var client = this.client;
  async.map(topics, function(name, next) {
    client.create(getDeleteTopicPath(name), next);
  }, callback);
};

/**
 * Create topic
 * 
 * @param {string} topic
 * @param {number} numPartitions
 * @param {number} replicationFactor
 * @param {object} configs
 * @param {Function} callback({Error}, {Map{Int -> Array{Int}}})
**/
Zookeeper.prototype.createTopic = function(topic, numPartitions, replicationFactor, configs, callback) {
  var client = this.client;

  this.listBrokers(function(brokers) {
    var brokerList = getSortedBrokerList(brokers);
    debug("createTopic: brokerList=%j", brokerList);
    try {
      var replicaAssignment = assignReplicasToBrokers(brokerList, numPartitions, replicationFactor);
      debug("createTopic repl=%j", replicaAssignment);
    } catch(err) {
      return callback(err);
    }
    createOrUpdateTopicPartitionAssignmentPathInZK(client, topic, replicaAssignment, configs, callback);
  });
}

function createOrUpdateTopicPartitionAssignmentPathInZK(client, topic, partitionReplicaAssignment, configs, update, callback) {
  if ('function' === typeof update)
    callback = update, update = false;
  // validate arguments
  try {
    Topic.validate(topic);
    logconfig.validate(configs);
    var repSize = -1;
    partitionReplicaAssignment.forEach(function(reps, partitionId) {
      if (!Array.isArray(reps) || !reps.every(isNumber) || !reps.every(isFinite) || !isNumber(partitionId) || !isFinite(partitionId))
        throw new Error("partitionReplicaAssignment must be a Map(Int -> [Int])");
      if (repSize < 0) {
        repSize = reps.length;
      } else if (reps.length !== repSize) {
        throw new Error("All partitions should have the same number of replicas.");
      }
      if (reps.length !== new Set(reps).size)
        throw new Error("Duplicate replica assignment found: " + partitionId + " -> "  + reps.join());
    });
  } catch(err) {
    return callback(err);
  }

  async.series([
      function(next) {
        if(!update) {
          client.exists(getTopicPath(topic), function(err, stat) {
            if (err) return next(err);
            if (stat) return next(new Error("Topic \"" + topic + "\" already exists."));
            next();
          });
        } else {
          next();
        }
      },
      function(next) {
        // write out the config if there is any, this isn't transactional with the partition assignments
        writeTopicConfig(client, topic, configs, next);
      },
      function(next) {
        // create the partition assignment
        writeTopicPartitionAssignment(client, topic, partitionReplicaAssignment, update, next);
      }
    ],
    function(err) {
      callback(err, partitionReplicaAssignment);
    }
  );
}

function writeTopicPartitionAssignment(client, topic, replicaAssignment, update, callback) {
  var zkPath = getTopicPath(topic);
  var jsonPartitionData = replicaAssignmentZkData(replicaAssignment);
  if (!update) {
    createPersistentPath(client, zkPath, jsonPartitionData, callback);
  } else {
    updatePersistentPath(client, zkPath, jsonPartitionData, callback);
  }
}

/**
 * Get JSON partition to replica map from zookeeper.
 * @param {Map{Int -> Array{Int}}} map
 * @return {string}
**/
function replicaAssignmentZkData(map) {
  return JSON.stringify({version: 1, partitions: map});
}
/**
 * Update the config for an existing topic and create a change notification so the change will propagate to other brokers
 *
 * Pass the final set of configs that will be applied to the topic. If any new configs need to be added or
 * existing configs need to be deleted, it should be done prior to invoking this API
 *
 * @param {string} topic
 * @param {object} configs
**/
Zookeeper.prototype.changeTopicConfig = function(topic, configs, callback) {
  var client = this.client;
  try {
    logconfig.validate(configs);
  } catch(err) {
    return callback(err);
  }

  writeTopicConfig(client, topic, configs, function(err) {
    if (err) return callback(err);

    // create the change notification
    client.create(TopicConfigChangesPrefix, ensureBuffer(JSON.stringify(topic)), PERSISTENT_SEQUENTIAL, callback);
  });
}

/**
 * Write out the topic config to zk, if there is any
 *
 * @param {ZkClient} client
 * @param {String} topic
 * @param {Object} configs
 * @param {Function} callback
**/
function writeTopicConfig(client, topic, configs, callback) {
  debug('writeTopicConfig: "%s", %j', topic, configs);
  // write the new config--may not exist if there were previously no overrides
  var value = {version: 1, config: configs};
  updatePersistentPath(client, getTopicConfigPath(topic), JSON.stringify(value), callback);
}

/**
 * Create the parent path
 *
 * @param {ZkClient} client
 * @param {String} path
 * @param {Function} callback
**/
function createParentPath(client, path, callback) {
  var parentDir = path.substring(0, path.lastIndexOf('/'));

  debug('createParentPath: "%s"', parentDir);

  if (parentDir.length != 0) {
    client.create(parentDir, function(err) {
      if (err) {
        if (err.code === NO_NODE) {
          return createParentPath(client, parentDir, function(err) {
            if (err) return callback(err);

            createParentPath(client, path, callback);
          });
        } else if (err.code !== NODE_EXISTS)
          return callback(err);
      }
      callback(null, path);
    });
  } else
    callback(null, path);
}

/**
 * Create an persistent node with the given path and data. Create parents if necessary.
 *
 * @param {ZkClient} client
 * @param {String} path
 * @param {String|Buffer} data
 * @param {Function} callback
**/
function createPersistentPath(client, path, data, callback) {
  debug('createPersistentPath: "%s" "%s"', path, data);

  data = ensureBuffer(data);

  client.create(path, data, function(err) {
    if (err) {
      if (err.code !== NO_NODE)
        return callback(err);

      createParentPath(client, path, function(err) {
        if (err) return callback(err);

        client.create(path, data, callback);
      });
    } else
      callback(null, path);
  })
}

/**
 * Update the value of a persistent node with the given path and data.
 * create parrent directory if necessary. Never return NO_NODE error.
 * @param {ZkClient} client
 * @param {String} path
 * @param {String|Buffer} data
 * @param {Function} callback
**/
function updatePersistentPath(client, path, data, callback) {
  debug('updatePersistentPath: "%s" "%s"', path, data);

  data = ensureBuffer(data);

  client.setData(path, data, function (err) {
    if (err) {
      if (err.code !== NO_NODE)
        return callback(err);

      createParentPath(client, path, function(err) {
        if (err) return callback(err);

        client.create(path, data, function(err) {
          if (err) {
            if (err.code !== NODE_EXISTS)
              return callback(err);
            client.setData(path, data, callback);
          } else
            callback(null);
        });
      });
    } else
      callback(null);
  });
}

function getSortedBrokerList(brokers) {
  return Object.keys(brokers)
    .map(function(no) { return no|0; })
    .sort();
}

/**
 * There are 2 goals of replica assignment:
 * 1. Spread the replicas evenly among brokers.
 * 2. For partitions assigned to a particular broker, their other replicas are spread over the other brokers.
 *
 * To achieve this goal, we:
 * 1. Assign the first replica of each partition by round-robin, starting from a random position in the broker list.
 * 2. Assign the remaining replicas of each partition with an increasing shift.
 *
 * Here is an example of assigning
 * broker-0  broker-1  broker-2  broker-3  broker-4
 * p0        p1        p2        p3        p4       (1st replica)
 * p5        p6        p7        p8        p9       (1st replica)
 * p4        p0        p1        p2        p3       (2nd replica)
 * p8        p9        p5        p6        p7       (2nd replica)
 * p3        p4        p0        p1        p2       (3nd replica)
 * p7        p8        p9        p5        p6       (3nd replica)
**/
function assignReplicasToBrokers(brokerList, nPartitions, replicationFactor) {
  var fixedStartIndex = -1, startPartitionId = -1;

  if (!isNumber(nPartitions) || !isFinite(nPartitions) || nPartitions <= 0)
    throw new Error("number of partitions must be larger than 0");
  if (!isNumber(replicationFactor) || !isFinite(replicationFactor) || replicationFactor <= 0)
    throw new Error("replication factor must be larger than 0");
  if (replicationFactor > brokerList.length)
    throw new Error("replication factor: " + replicationFactor +
      " larger than available brokers: " + brokerList.length);
  var ret = new Map();
  ret.toJSON = replicaAssignmentToJSON;
  var startIndex = (fixedStartIndex >= 0) ? fixedStartIndex : randNextInt(brokerList.length);
  var currentPartitionId = (startPartitionId >= 0) ? startPartitionId : 0;
  var nextReplicaShift = (fixedStartIndex >= 0) ? fixedStartIndex : randNextInt(brokerList.length);
  for (var i = 0; i < nPartitions; ++i) {
    if (currentPartitionId > 0 && (currentPartitionId % brokerList.length == 0))
      nextReplicaShift += 1;
    var firstReplicaIndex = (currentPartitionId + startIndex) % brokerList.length;
    var replicaList = [brokerList[firstReplicaIndex]];
    for (var j = 0; j < replicationFactor - 1; ++j)
      replicaList.push(brokerList[replicaIndex(firstReplicaIndex, nextReplicaShift, j, brokerList.length)]);
    ret.set(currentPartitionId, replicaList.reverse());
    currentPartitionId = currentPartitionId + 1;
  }
  return ret;
}

function replicaIndex(firstReplicaIndex, secondReplicaShift, replicaIndex, nBrokers) {
  var shift = 1 + (secondReplicaShift + replicaIndex) % (nBrokers - 1);
  return (firstReplicaIndex + shift) % nBrokers;
}

function randNextInt(max) {
  return (Math.random()*max)>>>0;
}

function replicaAssignmentToJSON() {
  var partitions = {};
  this.forEach(function(reps, partitionId) {
    partitions[partitionId] = reps;
  });
  return partitions;
}

function ensureBuffer(data) {
  return Buffer.isBuffer(data) ? data : new Buffer(data);
}

module.exports = Zookeeper;
