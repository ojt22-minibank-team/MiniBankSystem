package com.corebanking.queue;

import com.corebanking.exception.TransactionException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Producer service responsible for publishing fund transfer requests into the Message Queue.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TransferQueueProducer {

    private final TransferMessageQueue transferMessageQueue;

    /**
     * Publishes a transfer message to the queue.
     * Throws TransactionException if the queue is full (System Overload protection).
     */
    public void publish(TransferQueueMessage message) {
        boolean enqueued = transferMessageQueue.enqueue(message);
        if (!enqueued) {
            log.error("Failed to enqueue transfer ref: {}. Queue capacity reached.", message.getTransactionRef());
            throw new TransactionException("High transaction volume detected. Please retry in a few moments.");
        }
        log.info("Published transfer [{}] to processing queue. Backlog: {}", message.getTransactionRef(), transferMessageQueue.size());
    }

    public int getQueueDepth() {
        return transferMessageQueue.size();
    }
}
