Kafka tools
===========

Prerequisites
-------------

    node.js >= v4
    npm
    kafka: v0.8.1 - v0.10.2


Installation
------------

    npm install -g kafka-tools


Usage
-----

    export KAFKA_TOOLS_ZOOKEEPER="your.zookeeper.address/path-to-kafka"

### List brokers and topics

    kafka-topics


### List topic partition offsets and group ids (zookeeper based)


    kafka-topics topic-name


### List topic partition offsets and current group offsets (zookeeper based)

    kafka-topics topic-name group-name

### Set topic group offsets (zookeeper based)

    kafka-topics topic-name group-name offset [offset2 [offset3 [...]]]

- offsets will be boundary checked
- specify 0 to set earliest possible offset
- specify negative number to set offset relative to the latest partition offset
- multiple offsets will be cycled for each partition in topic

### Show all possible configuration overrides (hardcoded)

    kafka-topics -c

*NOTE*: The configuration overrides are supported by kafka 0.8.1 and later.
The configuration overrides notification payload changed since kafka 0.9.0.
`kafka-topics` checks brokers version stored in the zookeeper and if brokers version is >= 2
the enhanced notification payload is being send.

### Set topic configuration override

    kafka-topics topic-name -c retention.bytes=1000000000 retention.ms=86400000

### Delete topic configuration override

    kafka-topics topic-name -c retention.bytes= retention.ms=

### Clear topic

This overrides `retention.ms=1` and `cleanup.policy=delete`, waits until the topic is sweeped and restores original configuration overrides for a topic.

    kafka-topics topic-name --clear

### Delete topic

For this to work `delete.topic.enable` server config option must be `true`.

    kafka-topics topic-name --delete

### Create topic

    kafka-topics --create topic-name p<numPartitions> r<numReplicas> [config.to.override=value ...]

Example:

    kafka-topics --create some-important-topic p128 r3 retention.ms=31536000000

### Display help

    kafka-topics --help
    kafka-topics -h


Library
-------

This module is based on [kafka-node](https://www.npmjs.com/package/kafka-node) and [node-zookeeper-client](https://www.npmjs.com/package/node-zookeeper-client).
It simply extends [kafka-node/lib/zookeeper](https://github.com/SOHU-Co/kafka-node/blob/master/lib/zookeeper.js) `Zookeeper` object so it's possible to use it in your own programs:

```
  // extends kafka-node's zookeeper module
  var kafka = require('kafka-tools').kafka;

  var client = new kafka.Client(connectionString, clientId, clientOptions);

  // now you have access to extended zk api

  client.zk.listTopics(callback);
  client.zk.listGroupsPerTopic(topic, callback);
  client.zk.getTopicConfig(topic, callback);
  client.zk.changeTopicConfig2(topic, configs, callback);
  client.zk.changeTopicConfig(topic, configs[, notifyV2], callback);
  client.zk.getClientConfig(clientId, callback);
  client.zk.changeClientIdConfig(clientId, configs, callback);
  client.zk.createTopic(topic, numPartitions, replicationFactor, configs, callback);
  client.zk.deleteTopics(topics, callback);
```

The extended functions are based on [this specification](https://cwiki.apache.org/confluence/display/KAFKA/Kafka+data+structures+in+Zookeeper) as well as `scala/kafka/admin/AdminUtils.scala` sources of Apache Kafka.
