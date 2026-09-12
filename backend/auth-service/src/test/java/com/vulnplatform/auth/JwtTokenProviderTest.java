package com.vulnplatform.auth;

import com.vulnplatform.auth.entity.Permission;
import com.vulnplatform.auth.entity.Role;
import com.vulnplatform.auth.entity.User;
import com.vulnplatform.auth.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private User testUser;

    @BeforeEach
    void setUp() {
        // 256-bit test secret key
        String secret = "test_super_secret_key_minimum_32_characters_long_123456";
        jwtTokenProvider = new JwtTokenProvider(secret, 60000, 120000);

        Permission perm = new Permission("READ", "Lecture");
        Role role = new Role("ADMINISTRATEUR", "Admin");
        role.setPermissions(Set.of(perm));

        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("admin@vulnplatform.com");
        testUser.setPasswordHash("hashed_password");
        testUser.setFirstName("Admin");
        testUser.setLastName("User");
        testUser.setRoles(Set.of(role));
    }

    @Test
    @DisplayName("Génération et validation d'un access token JWT valide")
    void testGenerateAndValidateToken() {
        String token = jwtTokenProvider.generateToken(testUser);
        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals("admin@vulnplatform.com", jwtTokenProvider.getEmailFromToken(token));
    }

    @Test
    @DisplayName("Génération et validation d'un refresh token")
    void testGenerateRefreshToken() {
        String refreshToken = jwtTokenProvider.generateRefreshToken(testUser);
        assertNotNull(refreshToken);
        assertTrue(jwtTokenProvider.validateToken(refreshToken));
        assertEquals("admin@vulnplatform.com", jwtTokenProvider.getEmailFromToken(refreshToken));
    }

    @Test
    @DisplayName("Rejet d'un token falsifié ou invalide")
    void testInvalidToken() {
        assertFalse(jwtTokenProvider.validateToken("token.invalide.faussé"));
        assertFalse(jwtTokenProvider.validateToken(""));
        assertFalse(jwtTokenProvider.validateToken(null));
    }
}
