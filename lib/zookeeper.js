var async = require('async');
var Zookeeper = require('kafka-node/lib/zookeeper').Zookeeper;

var zookeeper = require('node-zookeeper-client');

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

Zookeeper.prototype.deleteTopics = function(topics, callback) {
  if ( ! Array.isArray(topics) )
    topics = [topics];
  var client = this.client;
  async.map(topics, function(name, next) {
    client.create(getDeleteTopicPath(name), next);
  }, callback);
};


/**
 * Update the config for an existing topic and create a change notification so the change will propagate to other brokers
 *
 * @param topic: The topic for which configs are being changed
 * @param configs: The final set of configs that will be applied to the topic. If any new configs need to be added or
 *                 existing configs need to be deleted, it should be done prior to invoking this API
 */
Zookeeper.prototype.changeTopicConfig = function(topic, configs, callback) {
  var client = this.client;
  try {
    logconfig.validate(configs);
  } catch(err) {
    return callback(err);
  }
  // write the new config--may not exist if there were previously no overrides
  var value = {version: 1, config: configs};
  updatePersistentPath(client, getTopicConfigPath(topic), JSON.stringify(value), function(err) {
    if (err) return callback(err);

    // create the change notification
    client.create(TopicConfigChangesPrefix, ensureBuffer(JSON.stringify(topic)), PERSISTENT_SEQUENTIAL, callback);
  });
}

/**
  * Create the parent path
 **/
function createParentPath(client, path, callback) {
  var parentDir = path.substring(0, path.lastIndexOf('/'))
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
  * Update the value of a persistent node with the given path and data.
  * create parrent directory if necessary. Never return NO_NODE error.
  * Return the updated path zkVersion
 **/
function updatePersistentPath(client, path, data, callback) {

  data = ensureBuffer(data);

  client.setData(path, data, function (err) {
    if (err) {
      if (err.code !== NO_NODE)
        return callback(err);

      return createParentPath(client, path, function(err) {
        if (err) return callback(err);

        client.create(client, path, data, function(err) {
          if (err) {
            if (err.code !== NODE_EXISTS)
              return callback(err);
            return client.setData(path, data, callback);
          }
          callback(null);
        });
      });
    }
    callback(null);
  });
}

function ensureBuffer(data) {
  return Buffer.isBuffer(data) ? data : new Buffer(data);
}

module.exports = Zookeeper;
