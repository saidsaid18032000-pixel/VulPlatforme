package com.vulnplatform.auth.controller;

import com.vulnplatform.auth.dto.CreateUserRequest;
import com.vulnplatform.auth.dto.UpdateUserRequest;
import com.vulnplatform.auth.dto.UserResponse;
import com.vulnplatform.auth.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Utilisateurs", description = "Gestion CRUD des utilisateurs et rôles (RBAC)")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'RESPONSABLE_SSI', 'ANALYSTE_SOC', 'AUDITEUR')")
    @Operation(summary = "Lister tous les utilisateurs de la plateforme")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'RESPONSABLE_SSI', 'ANALYSTE_SOC', 'AUDITEUR')")
    @Operation(summary = "Obtenir un utilisateur par son identifiant")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'RESPONSABLE_SSI')")
    @Operation(summary = "Créer un nouvel utilisateur")
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody CreateUserRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        String adminEmail = authentication != null ? authentication.getName() : "system";
        String ip = getClientIp(httpRequest);
        UserResponse created = userService.createUser(request, adminEmail, ip);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'RESPONSABLE_SSI')")
    @Operation(summary = "Mettre à jour un utilisateur existant")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable UUID id,
            @RequestBody UpdateUserRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        String adminEmail = authentication != null ? authentication.getName() : "system";
        String ip = getClientIp(httpRequest);
        UserResponse updated = userService.updateUser(id, request, adminEmail, ip);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR', 'RESPONSABLE_SSI')")
    @Operation(summary = "Activer ou désactiver un compte utilisateur")
    public ResponseEntity<UserResponse> toggleStatus(
            @PathVariable UUID id,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        String adminEmail = authentication != null ? authentication.getName() : "system";
        String ip = getClientIp(httpRequest);
        UserResponse updated = userService.toggleUserStatus(id, adminEmail, ip);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "Supprimer définitivement un utilisateur")
    public ResponseEntity<Map<String, String>> deleteUser(
            @PathVariable UUID id,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        String adminEmail = authentication != null ? authentication.getName() : "system";
        String ip = getClientIp(httpRequest);
        userService.deleteUser(id, adminEmail, ip);
        return ResponseEntity.ok(Map.of("message", "Utilisateur supprimé avec succès"));
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
