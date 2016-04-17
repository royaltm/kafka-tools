Kafka tools
===========

Prerequisites
-------------

    node.js >= 0.12
    npm

Installation
------------

    npm install -g royaltm/kafka-tools


Usage
-----

    export KAFKA_TOOLS_ZOOKEEPER="your.zookeeper.address/path-to-kafka"

### List brokers and topics

    kafka-topics


### List topic partition offsets and group ids


    kafka-topics topic-name


### List topic partition offsets and current group offsets

    kafka-topics topic-name group-name

### Set topic group offsets

    kafka-topics topic-name group-name offset [offset2 [offset3 [...]]]

- offsets will be boundary checked
- specify 0 to set earliest possible offset
- specify negative number to set offset relative to the latest partition offset
- multiple offsets will be cycled for each partition in topic

### Show all possible configuration overrides (hardcoded)

    kafka-topics -c

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
