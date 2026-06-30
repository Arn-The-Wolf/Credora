package com.credora.controller;

import com.credora.service.MpesaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/webhooks")
public class WebhookController {

    private final MpesaService mpesaService;

    public WebhookController(MpesaService mpesaService) {
        this.mpesaService = mpesaService;
    }

    @PostMapping("/mpesa")
    public ResponseEntity<Map<String, String>> mpesaCallback(@RequestBody String body) {
        mpesaService.handleCallback(body);
        return ResponseEntity.ok(Map.of("ResultCode", "0", "ResultDesc", "Accepted"));
    }
}
