package com.vulnplatform.asset.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/assets")
public class AssetHealthController {

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("service", "asset-service", "status", "UP");
    }
}
