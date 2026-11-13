package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Cấu hình WebSocket STOMP cho tính năng Chat thời gian thực.
 *
 * <ul>
 *   <li>Endpoint kết nối: {@code /ws-chat} (SockJS fallback enabled)</li>
 *   <li>Topic broker:    {@code /topic/**}  — broadcast 1-to-many</li>
 *   <li>Queue broker:    {@code /queue/**}  — point-to-point (mở rộng sau)</li>
 *   <li>App prefix:      {@code /app}       — prefix cho @MessageMapping</li>
 * </ul>
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-chat")
                .setAllowedOriginPatterns("*")   // CORS cho WebSocket
                .withSockJS();                   // SockJS fallback cho browser cũ / proxy
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Client subscribe tới /topic/... hoặc /queue/...
        registry.enableSimpleBroker("/topic", "/queue");

        // Client gửi tới /app/chat.send  =>  @MessageMapping("/chat.send")
        registry.setApplicationDestinationPrefixes("/app");
    }
}

