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
            if (err)
              return next(err);
            if (~topics.indexOf(topic))
              groups.push(name);
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

Zookeeper.prototype.deleteTopics = function(topics, callback) {
  if ( ! Array.isArray(topics) )
    topics = [topics];
  var deletePath = '/admin/delete_topics';
  var data = new Buffer('{"version": 1,"topics":' + JSON.stringify(topics) + '}');
  this.client.setData(deletePath, data, callback);
};

module.exports = Zookeeper;
