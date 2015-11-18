var async = require('async');
var Zookeeper = require('kafka-node/lib/zookeeper').Zookeeper;

Zookeeper.prototype.listTopics = function(callback) {
  var that = this;
  var brokerTopicsPath = '/brokers/topics';
  this.client.getChildren(
    brokerTopicsPath,
    function (err, topicNames) {
      if (err) return callback(err);
      topicNames.sort();
      async.map(topicNames, function(name, next) {
        that.client.getData(
          brokerTopicsPath + '/' + name,
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
  var conumersPath = '/consumers';
  var groups = [];
  this.client.getChildren(
    conumersPath,
    function (err, groupNames) {
      if (err) return callback(err);
      async.each(groupNames, function(name, next) {
        that.client.getChildren(
          conumersPath + '/' + name + '/offsets',
          function(err, topics) {
            if (err) {
              if (err.code !== -101)
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
  var configPath = '/config/topics/' + topic;
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
  var deletePath = '/admin/delete_topics/';
  async.map(topics, function(name, next) {
    client.create(deletePath + name, next);
  }, callback);
};

module.exports = Zookeeper;
