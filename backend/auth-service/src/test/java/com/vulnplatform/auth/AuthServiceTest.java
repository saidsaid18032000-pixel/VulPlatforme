package com.vulnplatform.auth;

import com.vulnplatform.auth.dto.AuthResponse;
import com.vulnplatform.auth.dto.LoginRequest;
import com.vulnplatform.auth.entity.Role;
import com.vulnplatform.auth.entity.User;
import com.vulnplatform.auth.repository.AuditLogRepository;
import com.vulnplatform.auth.repository.UserRepository;
import com.vulnplatform.auth.security.JwtTokenProvider;
import com.vulnplatform.auth.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AuthService authService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("user@vulnplatform.com");
        user.setPasswordHash("hashed_pw");
        user.setFirstName("Jean");
        user.setLastName("Dupont");
        user.setIsActive(true);

        Role role = new Role("ANALYSTE_SOC", "Analyste");
        user.setRoles(Set.of(role));
    }

    @Test
    @DisplayName("Login réussi retourne les tokens JWT et infos utilisateur")
    void testLoginSuccess() {
        LoginRequest req = new LoginRequest("user@vulnplatform.com", "Secret123!");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("user@vulnplatform.com", null));
        when(userRepository.findByEmailIgnoreCase("user@vulnplatform.com"))
                .thenReturn(Optional.of(user));
        when(tokenProvider.generateToken(user)).thenReturn("mock.access.token");
        when(tokenProvider.generateRefreshToken(user)).thenReturn("mock.refresh.token");
        when(tokenProvider.getExpirationMs()).thenReturn(900000L);

        AuthResponse resp = authService.login(req, "127.0.0.1");

        assertNotNull(resp);
        assertEquals("mock.access.token", resp.getAccessToken());
        assertEquals("mock.refresh.token", resp.getRefreshToken());
        assertEquals("user@vulnplatform.com", resp.getUser().getEmail());
        verify(auditLogRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("Login échoué lève BadCredentialsException")
    void testLoginBadCredentials() {
        LoginRequest req = new LoginRequest("user@vulnplatform.com", "MauvaisMotDePasse");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));
        when(userRepository.findByEmailIgnoreCase("user@vulnplatform.com"))
                .thenReturn(Optional.of(user));

        assertThrows(BadCredentialsException.class, () -> authService.login(req, "127.0.0.1"));
        verify(auditLogRepository, times(1)).save(any());
    }
}
