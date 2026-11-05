package com.corebanking.queue;

import com.corebanking.dto.P2PTransferRequestDto;
import com.corebanking.exception.TransactionException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class TransferQueueTest {

    @Test
    @DisplayName("TransferMessageQueue - Enqueue and Dequeue works correctly")
    void testEnqueueAndDequeue() throws InterruptedException {
        TransferMessageQueue queue = new TransferMessageQueue(100);

        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("50000.0000"))
                .currency("MMK")
                .build();

        TransferQueueMessage message = TransferQueueMessage.builder()
                .transactionRef("TXN-QUEUE-100")
                .customerId(UUID.randomUUID().toString())
                .request(request)
                .idempotencyKey("IDEMP-Q-1")
                .enqueuedAt(LocalDateTime.now())
                .build();

        boolean enqueued = queue.enqueue(message);
        assertTrue(enqueued);
        assertEquals(1, queue.size());

        TransferQueueMessage dequeued = queue.dequeue(1, TimeUnit.SECONDS);
        assertNotNull(dequeued);
        assertEquals("TXN-QUEUE-100", dequeued.getTransactionRef());
        assertEquals("2001111111", dequeued.getRequest().getSourceAccountNumber());
        assertEquals(new BigDecimal("50000.0000"), dequeued.getRequest().getAmount());
        assertEquals(0, queue.size());
    }

    @Test
    @DisplayName("TransferQueueProducer - Successfully publishes to queue")
    void testProducerPublish_Success() {
        TransferMessageQueue queue = new TransferMessageQueue(10);
        TransferQueueProducer producer = new TransferQueueProducer(queue);

        TransferQueueMessage message = TransferQueueMessage.builder()
                .transactionRef("TXN-PROD-01")
                .build();

        producer.publish(message);
        assertEquals(1, producer.getQueueDepth());
    }

    @Test
    @DisplayName("TransferQueueProducer - Saturated queue throws TransactionException")
    void testProducerPublish_QueueSaturated_ThrowsException() {
        // Queue with capacity 1
        TransferMessageQueue queue = new TransferMessageQueue(1);
        TransferQueueProducer producer = new TransferQueueProducer(queue);

        TransferQueueMessage msg1 = TransferQueueMessage.builder().transactionRef("TXN-1").build();
        TransferQueueMessage msg2 = TransferQueueMessage.builder().transactionRef("TXN-2").build();

        producer.publish(msg1);

        // Second publish exceeds capacity
        TransactionException ex = assertThrows(TransactionException.class, () ->
                producer.publish(msg2));
        assertTrue(ex.getMessage().contains("High transaction volume detected"));
    }
}
