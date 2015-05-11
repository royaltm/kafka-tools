Kafka tools
===========

Install:

npm install -g advertine/kafka-tools


Usage:

```
  # list brokers and topics

  kafka-topics

  # list topic partition offsets and group ids

  kafka-topics topic-name

  # list topic partition offset and current group offset

  kafka-topics topic-name group-name

  # set topic group offset
  # offset will be boundary checked
  # specify 0 to set earliest possible offset
  # specify negative number to set offset relative to the latest

  kafka-topics topic-name group-name offset
```

Tips
----

```
# clear topic
bin/kafka-topics.sh --alter --zookeeper kafka.advertine.com:2181/kafka081 --topic TOPIC_NAME --config retention.ms=1
# wait about 5 minutes
bin/kafka-topics.sh --alter --zookeeper kafka.advertine.com:2181/kafka081 --topic TOPIC_NAME --deleteConfig retention.ms
```
