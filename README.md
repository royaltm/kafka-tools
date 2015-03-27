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
