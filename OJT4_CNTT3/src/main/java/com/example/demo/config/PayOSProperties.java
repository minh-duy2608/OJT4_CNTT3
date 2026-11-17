package com.example.demo.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "payos")
public class PayOSProperties {
    private String clientId = "84cc7e13-c3ee-42a6-836c-b05389c2c615";
    private String apiKey = "35b18a36-d610-431f-b9ea-98de2a98692d";
    private String checksumKey = "1c1eeec05a98ad5f7f47e0599cfaa370255d703227fea18defcd7295012ce94e";
    private String bankName = "MB Bank (Ngân hàng Quân Đội)";
    private String bankBin = "970422";
    private String accountNumber = "0362490374";
    private String accountName = "HOANG THIEN SON";
    private String returnUrl = "http://165.101.46.54/orders";
    private String cancelUrl = "http://165.101.46.54/orders";
    private boolean enabled = true;

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && checksumKey != null && !checksumKey.isBlank();
    }
}

