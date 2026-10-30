package com.corebanking.queue;

import com.corebanking.dto.P2PTransferRequestDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Message DTO representing a queued P2P Fund Transfer task.
 * Designed to buffer high-concurrency transfer requests in a Message Queue.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferQueueMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * Unique Transaction Reference generated at enqueue time
     */
    private String transactionRef;

    /**
     * Authenticated Customer Identifier (UUID string)
     */
    private String customerId;

    /**
     * The transfer parameters submitted by customer
     */
    private P2PTransferRequestDto request;

    /**
     * Unique Idempotency Key to prevent duplicate processing
     */
    private String idempotencyKey;

    /**
     * Timestamp when the request was accepted into the Queue
     */
    private LocalDateTime enqueuedAt;

    /**
     * Retry count in case of transient database locks / timeouts
     */
    @Builder.Default
    private int retryCount = 0;
}
