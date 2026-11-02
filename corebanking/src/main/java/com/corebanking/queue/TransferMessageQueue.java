package com.corebanking.queue;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * High-Performance In-Memory Message Queue Buffer for Fund Transfers.
 * Implements a thread-safe Queue with backpressure support to prevent system overload.
 */
@Slf4j
@Component
public class TransferMessageQueue {

    /**
     * Default maximum queue buffer capacity (20,000 transactions)
     * Protects heap memory from exhausting during traffic spikes.
     */
    private static final int DEFAULT_CAPACITY = 20_000;

    private final BlockingQueue<TransferQueueMessage> queue;

    public TransferMessageQueue() {
        this.queue = new LinkedBlockingQueue<>(DEFAULT_CAPACITY);
    }

    public TransferMessageQueue(int capacity) {
        this.queue = new LinkedBlockingQueue<>(capacity > 0 ? capacity : DEFAULT_CAPACITY);
    }

    /**
     * Enqueue a transfer request into the message buffer.
     * Non-blocking with 2-second timeout before rejecting if queue is saturated.
     */
    public boolean enqueue(TransferQueueMessage message) {
        try {
            boolean accepted = queue.offer(message, 2, TimeUnit.SECONDS);
            if (accepted) {
                log.debug("Transfer [{}] enqueued. Current queue depth: {}", message.getTransactionRef(), queue.size());
            } else {
                log.warn("Transfer Queue saturated! Dropped request for ref: {}", message.getTransactionRef());
            }
            return accepted;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while enqueuing transfer: {}", message.getTransactionRef(), e);
            return false;
        }
    }

    /**
     * Dequeue a message for processing. Blocks up to specified timeout if empty.
     */
    public TransferQueueMessage dequeue(long timeout, TimeUnit unit) throws InterruptedException {
        return queue.poll(timeout, unit);
    }

    /**
     * Current number of waiting transfers in the queue
     */
    public int size() {
        return queue.size();
    }

    /**
     * Remaining capacity before backpressure kicks in
     */
    public int remainingCapacity() {
        return queue.remainingCapacity();
    }

    /**
     * Check if queue is currently empty
     */
    public boolean isEmpty() {
        return queue.isEmpty();
    }
}
