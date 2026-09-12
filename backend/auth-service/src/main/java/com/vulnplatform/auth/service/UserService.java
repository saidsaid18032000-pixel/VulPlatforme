package com.vulnplatform.auth.service;

import com.vulnplatform.auth.dto.CreateUserRequest;
import com.vulnplatform.auth.dto.UpdateUserRequest;
import com.vulnplatform.auth.dto.UserResponse;
import com.vulnplatform.auth.entity.AuditLog;
import com.vulnplatform.auth.entity.Role;
import com.vulnplatform.auth.entity.User;
import com.vulnplatform.auth.repository.AuditLogRepository;
import com.vulnplatform.auth.repository.RoleRepository;
import com.vulnplatform.auth.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            AuditLogRepository auditLogRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(AuthService::toUserResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Utilisateur introuvable avec l'identifiant: " + id));
        return AuthService.toUserResponse(user);
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request, String adminEmail, String ipAddress) {
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new IllegalArgumentException("Un utilisateur avec l'email " + request.getEmail() + " existe déjà.");
        }

        User user = new User();
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setIsActive(true);

        Set<Role> roles = resolveRoles(request.getRoles());
        user.setRoles(roles);

        User saved = userRepository.save(user);

        logAction(adminEmail, "USER_CREATED", "Création de l'utilisateur " + saved.getEmail() + " avec rôles: " + request.getRoles(), ipAddress);

        return AuthService.toUserResponse(saved);
    }

    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest request, String adminEmail, String ipAddress) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Utilisateur introuvable avec l'identifiant: " + id));

        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getIsActive() != null) user.setIsActive(request.getIsActive());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            Set<Role> roles = resolveRoles(request.getRoles());
            user.setRoles(roles);
        }

        User updated = userRepository.save(user);

        logAction(adminEmail, "USER_UPDATED", "Mise à jour de l'utilisateur " + updated.getEmail(), ipAddress);

        return AuthService.toUserResponse(updated);
    }

    @Transactional
    public UserResponse toggleUserStatus(UUID id, String adminEmail, String ipAddress) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Utilisateur introuvable avec l'identifiant: " + id));

        boolean newStatus = !Boolean.TRUE.equals(user.getIsActive());
        user.setIsActive(newStatus);
        User updated = userRepository.save(user);

        String statusStr = newStatus ? "ACTIVÉ" : "DÉSACTIVÉ";
        logAction(adminEmail, "USER_STATUS_CHANGED", "Statut de l'utilisateur " + user.getEmail() + " passé à " + statusStr, ipAddress);

        return AuthService.toUserResponse(updated);
    }

    @Transactional
    public void deleteUser(UUID id, String adminEmail, String ipAddress) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Utilisateur introuvable avec l'identifiant: " + id));

        String email = user.getEmail();
        userRepository.delete(user);

        logAction(adminEmail, "USER_DELETED", "Suppression définitive de l'utilisateur " + email, ipAddress);
    }

    private Set<Role> resolveRoles(Set<String> roleNames) {
        Set<Role> roles = new HashSet<>();
        if (roleNames == null || roleNames.isEmpty()) {
            roleRepository.findByName("ANALYSTE_SOC").ifPresent(roles::add);
            return roles;
        }

        for (String rName : roleNames) {
            roleRepository.findByName(rName.trim()).ifPresent(roles::add);
        }

        if (roles.isEmpty()) {
            roleRepository.findByName("ANALYSTE_SOC").ifPresent(roles::add);
        }
        return roles;
    }

    private void logAction(String adminEmail, String action, String details, String ipAddress) {
        UUID adminId = null;
        if (adminEmail != null) {
            adminId = userRepository.findByEmailIgnoreCase(adminEmail).map(User::getId).orElse(null);
        }
        auditLogRepository.save(new AuditLog(adminId, action, details, ipAddress));
    }
}
