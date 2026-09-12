package com.vulnplatform.auth.service;

import com.vulnplatform.auth.dto.AuthResponse;
import com.vulnplatform.auth.dto.LoginRequest;
import com.vulnplatform.auth.dto.RefreshTokenRequest;
import com.vulnplatform.auth.dto.UserResponse;
import com.vulnplatform.auth.entity.AuditLog;
import com.vulnplatform.auth.entity.User;
import com.vulnplatform.auth.repository.AuditLogRepository;
import com.vulnplatform.auth.repository.UserRepository;
import com.vulnplatform.auth.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtTokenProvider tokenProvider;
    private final AuditLogRepository auditLogRepository;

    public AuthService(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            JwtTokenProvider tokenProvider,
            AuditLogRepository auditLogRepository) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.tokenProvider = tokenProvider;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            User user = userRepository.findByEmailIgnoreCase(request.getEmail())
                    .orElseThrow(() -> new BadCredentialsException("Identifiants invalides"));

            String token = tokenProvider.generateToken(user);
            String refreshToken = tokenProvider.generateRefreshToken(user);

            auditLogRepository.save(new AuditLog(
                    user.getId(),
                    "LOGIN_SUCCESS",
                    "Connexion réussie pour " + user.getEmail(),
                    ipAddress
            ));

            return new AuthResponse(
                    token,
                    refreshToken,
                    tokenProvider.getExpirationMs(),
                    toUserResponse(user)
            );
        } catch (BadCredentialsException ex) {
            userRepository.findByEmailIgnoreCase(request.getEmail()).ifPresent(u ->
                auditLogRepository.save(new AuditLog(
                        u.getId(),
                        "LOGIN_FAILED",
                        "Échec de connexion (mot de passe incorrect)",
                        ipAddress
                ))
            );
            throw new BadCredentialsException("Email ou mot de passe incorrect.");
        }
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request, String ipAddress) {
        if (!tokenProvider.validateToken(request.getRefreshToken())) {
            throw new IllegalArgumentException("Refresh token invalide ou expiré.");
        }

        String email = tokenProvider.getEmailFromToken(request.getRefreshToken());
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non trouvé"));

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new IllegalArgumentException("Compte utilisateur inactif.");
        }

        String newAccessToken = tokenProvider.generateToken(user);
        String newRefreshToken = tokenProvider.generateRefreshToken(user);

        return new AuthResponse(
                newAccessToken,
                newRefreshToken,
                tokenProvider.getExpirationMs(),
                toUserResponse(user)
        );
    }

    @Transactional
    public void logout(String email, String ipAddress) {
        userRepository.findByEmailIgnoreCase(email).ifPresent(u ->
            auditLogRepository.save(new AuditLog(
                    u.getId(),
                    "LOGOUT",
                    "Déconnexion de l'utilisateur " + email,
                    ipAddress
            ))
        );
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non trouvé"));
        return toUserResponse(user);
    }

    public static UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getIsActive(),
                user.getCreatedAt() != null ? user.getCreatedAt().toString() : null,
                user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : null,
                user.getRoles() != null
                        ? user.getRoles().stream().map(r -> r.getName()).collect(Collectors.toList())
                        : List.of(),
                user.getRoles() != null
                        ? user.getRoles().stream()
                            .filter(r -> r.getPermissions() != null)
                            .flatMap(r -> r.getPermissions().stream().map(p -> p.getCode()))
                            .distinct()
                            .collect(Collectors.toList())
                        : List.of()
        );
    }
}
