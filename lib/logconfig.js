var Config = require('./config');

var SegmentBytesProp = "segment.bytes"
  , SegmentMsProp = "segment.ms"
  , SegmentJitterMsProp = "segment.jitter.ms"
  , SegmentIndexBytesProp = "segment.index.bytes"
  , FlushMessagesProp = "flush.messages"
  , FlushMsProp = "flush.ms"
  , RetentionBytesProp = "retention.bytes"
  , RententionMsProp = "retention.ms"
  , MaxMessageBytesProp = "max.message.bytes"
  , IndexIntervalBytesProp = "index.interval.bytes"
  , DeleteRetentionMsProp = "delete.retention.ms"
  , FileDeleteDelayMsProp = "file.delete.delay.ms"
  , MinCleanableDirtyRatioProp = "min.cleanable.dirty.ratio"
  , CleanupPolicyProp = "cleanup.policy"
  , UncleanLeaderElectionEnableProp = "unclean.leader.election.enable"
  , MinInSyncReplicasProp = "min.insync.replicas"
  , CompressionTypeProp = "compression.type"
  , PreAllocateEnableProp = "preallocate"
  , MessageFormatVersionProp = "message.format.version"
  , MessageTimestampTypeProp = "message.timestamp.type"
  , MessageTimestampDifferenceMaxMsProp = "message.timestamp.difference.max.ms"
;

  var SegmentSizeDoc = "This configuration controls the segment file size for " +
    "the log. Retention and cleaning is always done a file at a time so a larger " +
    "segment size means fewer files but less granular control over retention."
  , SegmentMsDoc = "This configuration controls the period of time after " +
    "which Kafka will force the log to roll even if the segment file isn't full " +
    "to ensure that retention can delete or compact old data."
  , SegmentJitterMsDoc = "The maximum random jitter subtracted from the scheduled segment roll time to avoid" +
    " thundering herds of segment rolling"
  , FlushIntervalDoc = "This setting allows specifying an interval at which we " +
    "will force an fsync of data written to the log. For example if this was set to 1 " +
    "we would fsync after every message; if it were 5 we would fsync after every five " +
    "messages. In general we recommend you not set this and use replication for " +
    "durability and allow the operating system's background flush capabilities as it " +
    "is more efficient. This setting can be overridden on a per-topic basis."
  , FlushMsDoc = "This setting allows specifying a time interval at which we will " +
    "force an fsync of data written to the log. For example if this was set to 1000 " +
    "we would fsync after 1000 ms had passed. In general we recommend you not set " +
    "this and use replication for durability and allow the operating system's background " +
    "flush capabilities as it is more efficient."
  , RetentionSizeDoc = "This configuration controls the maximum size a log can grow " +
    "to before we will discard old log segments to free up space if we are using the " +
    "\"delete\" retention policy. By default there is no size limit only a time limit."
  , RetentionMsDoc = "This configuration controls the maximum time we will retain a " +
    "log before we will discard old log segments to free up space if we are using the " +
    "\"delete\" retention policy. This represents an SLA on how soon consumers must read " +
    "their data."
  , MaxIndexSizeDoc = "This configuration controls the size of the index that maps " +
    "offsets to file positions. We preallocate this index file and shrink it only after log " +
    "rolls. You generally should not need to change this setting."
  , MaxMessageSizeDoc = "This is largest message size Kafka will allow to be appended. Note that if you increase" +
    " this size you must also increase your consumer's fetch size so they can fetch messages this large."
  , IndexIntervalDoc = "This setting controls how frequently Kafka adds an index " +
    "entry to it's offset index. The default setting ensures that we index a message " +
    "roughly every 4096 bytes. More indexing allows reads to jump closer to the exact " +
    "position in the log but makes the index larger. You probably don't need to change " +
    "this."
  , FileDeleteDelayMsDoc = "The time to wait before deleting a file from the filesystem"
  , DeleteRetentionMsDoc = "The amount of time to retain delete tombstone markers " +
    "for log compacted topics. This setting also gives a bound " +
    "on the time in which a consumer must complete a read if they begin from offset 0 " +
    "to ensure that they get a valid snapshot of the final stage (otherwise delete " +
    "tombstones may be collected before they complete their scan)."
  , MinCompactionLagMsDoc = "The minimum time a message will remain uncompacted in the log. " +
    "Only applicable for logs that are being compacted."
  , MinCleanableRatioDoc = "This configuration controls how frequently the log " +
    "compactor will attempt to clean the log (assuming log " +
    "compaction is enabled). By default we will avoid cleaning a log where more than " +
    "50% of the log has been compacted. This ratio bounds the maximum space wasted in " +
    "the log by duplicates (at 50% at most 50% of the log could be duplicates). A " +
    "higher ratio will mean fewer, more efficient cleanings but will mean more wasted " +
    "space in the log."
  , CompactDoc = "A string that is either \"delete\" or \"compact\". This string " +
    "designates the retention policy to use on old log segments. The default policy " +
    "(\"delete\") will discard old segments when their retention time or size limit has " +
    "been reached. The \"compact\" setting will enable log " +
    "compaction on the topic."
  , UncleanLeaderElectionEnableDoc = "Indicates whether to enable replicas not in the ISR set to be elected as" +
    " leader as a last resort, even though doing so may result in data loss"
  , MinInSyncReplicasDoc = "When a producer sets acks to \"all\" (or \"-1\"), " +
    "min.insync.replicas specifies the minimum number of replicas that must acknowledge " +
    "a write for the write to be considered successful. If this minimum cannot be met, " +
    "then the producer will raise an exception (either NotEnoughReplicas or " +
    "NotEnoughReplicasAfterAppend).\nWhen used together, min.insync.replicas and acks " +
    "allow you to enforce greater durability guarantees. A typical scenario would be to " +
    "create a topic with a replication factor of 3, set min.insync.replicas to 2, and " +
    "produce with acks of \"all\". This will ensure that the producer raises an exception " +
    "if a majority of replicas do not receive a write."
  , CompressionTypeDoc = "Specify the final compression type for a given topic. This configuration accepts the " +
    "standard compression codecs ('gzip', 'snappy', lz4). It additionally accepts 'uncompressed' which is equivalent to " +
    "no compression; and 'producer' which means retain the original compression codec set by the producer."
  , PreAllocateEnableDoc ="Should pre allocate file when create new segment?"
  , MessageFormatVersionDoc = "Specify the message format version the broker will use to append messages to the logs. The value should be a valid ApiVersion. " +
    "Some examples are: 0.8.2, 0.9.0.0, 0.10.0, check ApiVersion for more details. By setting a particular message format version, the " +
    "user is certifying that all the existing messages on disk are smaller or equal than the specified version. Setting this value incorrectly " +
    "will cause consumers with older versions to break as they will receive messages with a format that they don't understand."
  , MessageTimestampTypeDoc = "Define whether the timestamp in the message is message create time or log append time. The value should be either " +
    "`CreateTime` or `LogAppendTime`"
  , MessageTimestampDifferenceMaxMsDoc = "The maximum difference allowed between the timestamp when a broker receives " +
    "a message and the timestamp specified in the message. If message.timestamp.type=CreateTime, a message will be rejected " +
    "if the difference in timestamp exceeds this threshold. This configuration is ignored if message.timestamp.type=LogAppendTime."
;

function TokenString(tokens) {
  tokens = tokens.split(/\s+/);
  this.pattern = new RegExp(tokens.map(function(token) {
    return '^' + token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$';
  }).join('|'));
  this.doc = tokens.map(function(token) {
    return '"' + token + '"';
  }).join(' or ');
}

var CLEANUP_POLICY = new TokenString('delete compact compact,delete delete,compact')
  , COMPRESSION    = new TokenString('producer gzip snappy lz4 uncompressed')
  , FORMAT_VERSION = new TokenString('0.8.0 0.8.1 0.8.2 0.9.0 0.10.0-IV0 0.10.0-IV1 0.10.0 0.10.1-IV0')
  , TIMESTAMP_TYPE = new TokenString('CreateTime LogAppendTime')
;

module.exports = new Config()
  .define(SegmentBytesProp, Config.INT_NOT_NEGATIVE, SegmentSizeDoc)
  .define(SegmentMsProp, Config.LONG_NOT_NEGATIVE, SegmentMsDoc)
  .define(SegmentJitterMsProp, Config.LONG_NOT_NEGATIVE, SegmentJitterMsDoc)
  .define(SegmentIndexBytesProp, Config.INT_NOT_NEGATIVE, MaxIndexSizeDoc)
  .define(FlushMessagesProp, Config.LONG_NOT_NEGATIVE, FlushIntervalDoc)
  .define(FlushMsProp, Config.LONG_NOT_NEGATIVE, FlushMsDoc)
  // can be negative. See kafka.log.LogManager.cleanupSegmentsToMaintainSize
  .define(RetentionBytesProp, Config.LONG, RetentionSizeDoc)
  .define(RententionMsProp, Config.LONG_NOT_NEGATIVE, RetentionMsDoc)
  .define(MaxMessageBytesProp, Config.INT_NOT_NEGATIVE, MaxMessageSizeDoc)
  .define(IndexIntervalBytesProp, Config.INT_NOT_NEGATIVE,  IndexIntervalDoc)
  .define(DeleteRetentionMsProp, Config.LONG_NOT_NEGATIVE, DeleteRetentionMsDoc)
  .define(FileDeleteDelayMsProp, Config.LONG_NOT_NEGATIVE, FileDeleteDelayMsDoc)
  .define(MinCleanableDirtyRatioProp, Config.DOUBLE_0_1, MinCleanableRatioDoc)
  .define(CleanupPolicyProp, CLEANUP_POLICY, CompactDoc)
  .define(UncleanLeaderElectionEnableProp, Config.BOOLEAN, UncleanLeaderElectionEnableDoc)
  .define(MinInSyncReplicasProp, Config.INT_1_OR_MORE, MinInSyncReplicasDoc)
  .define(CompressionTypeProp, COMPRESSION, CompressionTypeDoc)
  .define(PreAllocateEnableProp, Config.BOOLEAN, PreAllocateEnableDoc)
  .define(MessageFormatVersionProp, FORMAT_VERSION, MessageFormatVersionDoc)
  .define(MessageTimestampTypeProp, TIMESTAMP_TYPE, MessageTimestampTypeDoc)
  .define(MessageTimestampDifferenceMaxMsProp, Config.LONG_NOT_NEGATIVE, MessageTimestampDifferenceMaxMsDoc)
