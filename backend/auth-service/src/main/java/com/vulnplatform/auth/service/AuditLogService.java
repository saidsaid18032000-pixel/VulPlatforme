package com.vulnplatform.auth.service;

import com.vulnplatform.auth.dto.AuditLogResponse;
import com.vulnplatform.auth.entity.AuditLog;
import com.vulnplatform.auth.entity.User;
import com.vulnplatform.auth.repository.AuditLogRepository;
import com.vulnplatform.auth.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public AuditLogService(AuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getRecentLogs() {
        List<AuditLog> logs = auditLogRepository.findTop50ByOrderByCreatedAtDesc();

        Map<UUID, String> userEmailMap = new HashMap<>();
        for (AuditLog log : logs) {
            if (log.getUserId() != null && !userEmailMap.containsKey(log.getUserId())) {
                userRepository.findById(log.getUserId())
                        .ifPresent(u -> userEmailMap.put(u.getId(), u.getEmail()));
            }
        }

        return logs.stream().map(l -> new AuditLogResponse(
                l.getId(),
                l.getUserId(),
                l.getUserId() != null ? userEmailMap.getOrDefault(l.getUserId(), "Utilisateur supprimé") : "Système",
                l.getAction(),
                l.getDetails(),
                l.getIpAddress(),
                l.getCreatedAt() != null ? l.getCreatedAt().toString() : null
        )).collect(Collectors.toList());
    }
}
