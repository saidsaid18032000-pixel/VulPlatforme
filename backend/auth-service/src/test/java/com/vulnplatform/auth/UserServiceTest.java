package com.vulnplatform.auth;

import com.vulnplatform.auth.dto.CreateUserRequest;
import com.vulnplatform.auth.dto.UpdateUserRequest;
import com.vulnplatform.auth.dto.UserResponse;
import com.vulnplatform.auth.entity.Role;
import com.vulnplatform.auth.entity.User;
import com.vulnplatform.auth.repository.AuditLogRepository;
import com.vulnplatform.auth.repository.RoleRepository;
import com.vulnplatform.auth.repository.UserRepository;
import com.vulnplatform.auth.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private Role roleAdmin;
    private User user;

    @BeforeEach
    void setUp() {
        roleAdmin = new Role("ADMINISTRATEUR", "Admin");
        user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("user@vulnplatform.com");
        user.setPasswordHash("hashed_pwd");
        user.setFirstName("Alice");
        user.setLastName("Security");
        user.setIsActive(true);
        user.setRoles(Set.of(roleAdmin));
    }

    @Test
    @DisplayName("Création d'un utilisateur avec rôle et hashage de mot de passe")
    void testCreateUserSuccess() {
        CreateUserRequest req = new CreateUserRequest();
        req.setEmail("new@vulnplatform.com");
        req.setPassword("SecretPass123!");
        req.setFirstName("New");
        req.setLastName("User");
        req.setRoles(Set.of("ADMINISTRATEUR"));

        when(userRepository.existsByEmailIgnoreCase("new@vulnplatform.com")).thenReturn(false);
        when(passwordEncoder.encode("SecretPass123!")).thenReturn("encoded_pass");
        when(roleRepository.findByName("ADMINISTRATEUR")).thenReturn(Optional.of(roleAdmin));
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        UserResponse resp = userService.createUser(req, "admin@vulnplatform.com", "127.0.0.1");

        assertNotNull(resp);
        assertEquals("new@vulnplatform.com", resp.getEmail());
        assertTrue(resp.getRoles().contains("ADMINISTRATEUR"));
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Refus de création si l'email existe déjà")
    void testCreateUserDuplicateEmail() {
        CreateUserRequest req = new CreateUserRequest();
        req.setEmail("existing@vulnplatform.com");

        when(userRepository.existsByEmailIgnoreCase("existing@vulnplatform.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> userService.createUser(req, "admin@vulnplatform.com", "127.0.0.1"));
    }

    @Test
    @DisplayName("Bascule du statut actif / inactif d'un utilisateur")
    void testToggleUserStatus() {
        UUID id = user.getId();
        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserResponse resp = userService.toggleUserStatus(id, "admin@vulnplatform.com", "127.0.0.1");

        assertNotNull(resp);
        assertFalse(resp.getIsActive());
    }

    @Test
    @DisplayName("Suppression d'un utilisateur existant")
    void testDeleteUser() {
        UUID id = user.getId();
        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        userService.deleteUser(id, "admin@vulnplatform.com", "127.0.0.1");

        verify(userRepository, times(1)).delete(user);
    }
}
