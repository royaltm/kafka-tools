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
  # specify -1 to set earliest possible offset
  # specify some big number to set latest possible offset

  kafka-topics topic-name group-name offset
```
