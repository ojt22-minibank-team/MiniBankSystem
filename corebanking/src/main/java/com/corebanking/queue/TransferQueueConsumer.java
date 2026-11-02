package com.corebanking.queue;

import com.corebanking.service.P2PTransferService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Consumer worker pool that continuously dequeues and processes fund transfers.
 * Implements rate-limiting and steady-concurrency queue consumption.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TransferQueueConsumer {

    private final TransferMessageQueue transferMessageQueue;
    private final P2PTransferService p2pTransferService;

    /**
     * Number of concurrent worker threads processing transactions from the queue
     */
    private static final int WORKER_THREADS = 5;

    private final AtomicBoolean running = new AtomicBoolean(false);
    private ExecutorService workerPool;

    @PostConstruct
    public void startWorkers() {
        running.set(true);
        workerPool = Executors.newFixedThreadPool(WORKER_THREADS, r -> {
            Thread t = new Thread(r, "transfer-queue-worker");
            t.setDaemon(true);
            return t;
        });

        for (int i = 1; i <= WORKER_THREADS; i++) {
            final int workerId = i;
            workerPool.submit(() -> runWorkerLoop(workerId));
        }

        log.info("Started {} Transfer Queue consumer workers successfully.", WORKER_THREADS);
    }

    private void runWorkerLoop(int workerId) {
        log.debug("Transfer consumer worker-{} started.", workerId);
        while (running.get() && !Thread.currentThread().isInterrupted()) {
            try {
                // Poll message with 1 second timeout to permit clean shutdown
                TransferQueueMessage message = transferMessageQueue.dequeue(1, TimeUnit.SECONDS);
                if (message != null) {
                    processMessage(workerId, message);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("Worker-{} encountered unexpected error while processing queue:", workerId, e);
            }
        }
        log.debug("Transfer consumer worker-{} stopped.", workerId);
    }

    private void processMessage(int workerId, TransferQueueMessage message) {
        log.info("Worker-{} dequeued transfer ref: {} (enqueued at: {})",
                workerId, message.getTransactionRef(), message.getEnqueuedAt());
        try {
            p2pTransferService.executeQueuedTransfer(message);
        } catch (Exception e) {
            log.error("Worker-{} failed to execute queued transfer ref: {}", workerId, message.getTransactionRef(), e);
            try {
                p2pTransferService.executeAutoReversal(
                        message.getTransactionRef(),
                        "Asynchronous queue execution failure: " + e.getMessage(),
                        "QUEUE_EXECUTION_FAILED"
                );
            } catch (Exception revEx) {
                log.error("Worker-{} failed to trigger auto-reversal for ref: {}", workerId, message.getTransactionRef(), revEx);
                p2pTransferService.markQueuedTransferFailed(message.getTransactionRef(), e.getMessage());
            }
        }
    }

    @PreDestroy
    public void stopWorkers() {
        log.info("Stopping Transfer Queue consumer workers...");
        running.set(false);
        if (workerPool != null) {
            workerPool.shutdown();
            try {
                if (!workerPool.awaitTermination(5, TimeUnit.SECONDS)) {
                    workerPool.shutdownNow();
                }
            } catch (InterruptedException e) {
                workerPool.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
        log.info("Transfer Queue consumer workers stopped.");
    }
}
