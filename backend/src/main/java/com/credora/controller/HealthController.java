package com.credora.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
class HealthController {
    @GetMapping({"/health", "/actuator/health"})
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
