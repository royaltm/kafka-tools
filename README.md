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

### list brokers and topics

    kafka-topics


### list topic partition offsets and group ids


    kafka-topics topic-name


### list topic partition offset and current group offset

    kafka-topics topic-name group-name

### set topic group offset

offset will be boundary checked
specify 0 to set earliest possible offset
specify negative number to set offset relative to the latest

    kafka-topics topic-name group-name offset

### delete topic (must have topic deletion enabled on kafka server)

    kafka-topics topic-name --delete

### show all possible configuration overrides (hardcoded)

    kafka-topics -c

### topic configuration override

    kafka-topics topic-name -c retention.bytes=1000000000 retention.ms=86400000

### delete topic configuration override

    kafka-topics topic-name -c retention.bytes= retention.ms=

### clear topic

this overrides retention.ms=1 waits until the topic is sweeped and restores original config override for retention.ms

    kafka-topics topic-name --clear
