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
;
var SegmentSizeDoc = "The hard maximum for the size of a segment file in the log"
  , SegmentMsDoc = "The soft maximum on the amount of time before a new log segment is rolled"
  , SegmentJitterMsDoc = "The maximum random jitter subtracted from segmentMs to avoid thundering herds of segment rolling"
  , FlushIntervalDoc = "The number of messages that can be written to the log before a flush is forced"
  , FlushMsDoc = "The amount of time the log can have dirty data before a flush is forced"
  , RetentionSizeDoc = "The approximate total number of bytes this log can use"
  , RetentionMsDoc = "The approximate maximum age of the last segment that is retained"
  , MaxIndexSizeDoc = "The maximum size of an index file"
  , MaxMessageSizeDoc = "The maximum size of a message"
  , IndexIntervalDoc = "The approximate number of bytes between index entries"
  , FileDeleteDelayMsDoc = "The time to wait before deleting a file from the filesystem"
  , DeleteRetentionMsDoc = "The time to retain delete markers in the log. Only applicable for logs that are being compacted."
  , MinCleanableRatioDoc = "The ratio of bytes that are available for cleaning to the bytes already cleaned"
  , CompactDoc = "Should old segments in this log be deleted or deduplicated?"
  , UncleanLeaderElectionEnableDoc = "Indicates whether unclean leader election is enabled"
  , MinInSyncReplicasDoc = "If number of insync replicas drops below this number, we stop accepting writes with -1 (or all) required acks"
;

var CLEANUP_POLICY = {
  pattern: /^delete$|^compact$/,
  doc: "\"delete\" or \"compact\""
};

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
