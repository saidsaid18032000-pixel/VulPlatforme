package com.vulnplatform.auth.config;

import com.vulnplatform.auth.entity.AuditLog;
import com.vulnplatform.auth.entity.Permission;
import com.vulnplatform.auth.entity.Role;
import com.vulnplatform.auth.entity.User;
import com.vulnplatform.auth.repository.AuditLogRepository;
import com.vulnplatform.auth.repository.PermissionRepository;
import com.vulnplatform.auth.repository.RoleRepository;
import com.vulnplatform.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    public DataInitializer(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PermissionRepository permissionRepository,
            AuditLogRepository auditLogRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking and initializing Sprint 1 master data...");

        // 1. Permissions
        Permission permRead = getOrCreatePermission("READ", "Lecture");
        Permission permWrite = getOrCreatePermission("WRITE", "Écriture");
        Permission permAdmin = getOrCreatePermission("ADMIN", "Administration");

        // 2. Roles
        Role roleAdmin = getOrCreateRole("ADMINISTRATEUR", "Administrateur de la plateforme");
        Role roleSoc = getOrCreateRole("ANALYSTE_SOC", "Analyste SOC");
        Role roleSsi = getOrCreateRole("RESPONSABLE_SSI", "Responsable SSI");
        Role roleAuditeur = getOrCreateRole("AUDITEUR", "Auditeur");

        // Assign permissions to roles
        roleAdmin.setPermissions(new HashSet<>(Set.of(permRead, permWrite, permAdmin)));
        roleSsi.setPermissions(new HashSet<>(Set.of(permRead, permWrite, permAdmin)));
        roleSoc.setPermissions(new HashSet<>(Set.of(permRead, permWrite)));
        roleAuditeur.setPermissions(new HashSet<>(Set.of(permRead)));
        roleRepository.saveAll(Set.of(roleAdmin, roleSoc, roleSsi, roleAuditeur));

        // 3. Seed Users if not present
        if (!userRepository.existsByEmailIgnoreCase("admin@vulnplatform.com")) {
            User admin = new User();
            admin.setEmail("admin@vulnplatform.com");
            admin.setPasswordHash(passwordEncoder.encode("Admin123!"));
            admin.setFirstName("Nader");
            admin.setLastName("Administrateur");
            admin.setIsActive(true);
            admin.getRoles().add(roleAdmin);
            userRepository.save(admin);

            auditLogRepository.save(new AuditLog(
                    admin.getId(),
                    "INITIAL_SETUP",
                    "Compte administrateur initial créé automatiquement",
                    "127.0.0.1"
            ));
            log.info("Default admin user created: admin@vulnplatform.com / Admin123!");
        }

        if (!userRepository.existsByEmailIgnoreCase("analyste@vulnplatform.com")) {
            User analyst = new User();
            analyst.setEmail("analyste@vulnplatform.com");
            analyst.setPasswordHash(passwordEncoder.encode("Analyst123!"));
            analyst.setFirstName("Sarah");
            analyst.setLastName("Analyste");
            analyst.setIsActive(true);
            analyst.getRoles().add(roleSoc);
            userRepository.save(analyst);
            log.info("Default analyst user created: analyste@vulnplatform.com / Analyst123!");
        }

        if (!userRepository.existsByEmailIgnoreCase("ssi@vulnplatform.com")) {
            User ssi = new User();
            ssi.setEmail("ssi@vulnplatform.com");
            ssi.setPasswordHash(passwordEncoder.encode("Ssi123!"));
            ssi.setFirstName("Marc");
            ssi.setLastName("RSSI");
            ssi.setIsActive(true);
            ssi.getRoles().add(roleSsi);
            userRepository.save(ssi);
            log.info("Default SSI user created: ssi@vulnplatform.com / Ssi123!");
        }

        // 4. Seed initial Assets, Scans, and Vulnerabilities for realistic Dashboard (US1.4)
        seedDashboardData();
    }

    private Permission getOrCreatePermission(String code, String description) {
        return permissionRepository.findByCode(code)
                .orElseGet(() -> permissionRepository.save(new Permission(code, description)));
    }

    private Role getOrCreateRole(String name, String description) {
        return roleRepository.findByName(name)
                .orElseGet(() -> roleRepository.save(new Role(name, description)));
    }

    private void seedDashboardData() {
        try {
            Integer assetCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM assets", Integer.class);
            if (assetCount != null && assetCount == 0) {
                log.info("Seeding realistic sample assets for Dashboard (Sprint 1)...");
                jdbcTemplate.execute("""
                    INSERT INTO assets (name, asset_type, ip_address, hostname, os, criticality, status) VALUES
                    ('SRV-WEB-PROD-01', 'SERVER', '192.168.1.10', 'web-prod.local', 'Ubuntu 22.04', 'CRITICAL', 'ACTIVE'),
                    ('DB-POSTGRES-CLUSTER', 'DATABASE', '192.168.1.20', 'db-primary.local', 'Debian 12', 'CRITICAL', 'ACTIVE'),
                    ('FIREWALL-MAIN-GATEWAY', 'NETWORK', '192.168.1.1', 'fw-edge.local', 'pfSense 2.7', 'HIGH', 'ACTIVE'),
                    ('SRV-APP-AUTH-01', 'SERVER', '192.168.1.15', 'auth-service.local', 'Alpine Linux', 'HIGH', 'ACTIVE'),
                    ('WS-SOC-ANALYST-01', 'WORKSTATION', '192.168.10.101', 'ws-soc-01.local', 'Windows 11', 'MEDIUM', 'ACTIVE'),
                    ('SW-CORE-CISCO-01', 'NETWORK', '192.168.1.2', 'core-switch.local', 'Cisco IOS-XE', 'MEDIUM', 'ACTIVE')
                """);
            }

            Integer scanCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM scans", Integer.class);
            if (scanCount != null && scanCount == 0) {
                log.info("Seeding realistic sample scans for Dashboard (Sprint 1)...");
                jdbcTemplate.execute("""
                    INSERT INTO scans (name, scan_type, status, started_at, finished_at) VALUES
                    ('Scan Réseau DMZ Hebdomadaire', 'NETWORK', 'COMPLETED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '47 hours'),
                    ('Audit Applicatif Web & APIs', 'WEB_APPLICATION', 'COMPLETED', NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours'),
                    ('Scan Conformité Infrastructure', 'COMPLIANCE', 'IN_PROGRESS', NOW() - INTERVAL '2 hours', NULL)
                """);
            }

            Integer vulnCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM vulnerabilities", Integer.class);
            if (vulnCount != null && vulnCount == 0) {
                log.info("Seeding realistic sample vulnerabilities for Dashboard (Sprint 1)...");
                jdbcTemplate.execute("""
                    INSERT INTO vulnerabilities (cve_id, title, description, severity, cvss_score, status, discovered_at) VALUES
                    ('CVE-2024-3094', 'Porte dérobée XZ Utils (liblzma)', 'Vulnérabilité critique d''injection de code dans liblzma/sshd', 'CRITICAL', 10.0, 'OPEN', NOW() - INTERVAL '5 days'),
                    ('CVE-2023-38606', 'Dépassement de tampon OpenSSL TLS', 'Dépassement de tampon mémoire lors de la négociation TLS 1.3', 'CRITICAL', 9.8, 'OPEN', NOW() - INTERVAL '4 days'),
                    ('CVE-2023-4863', 'Exécution de code arbitraire libwebp', 'Corruption de tas exploitable via des images WebP forgées', 'HIGH', 8.8, 'OPEN', NOW() - INTERVAL '3 days'),
                    ('CVE-2023-44487', 'Attaque HTTP/2 Rapid Reset (DDoS)', 'Épuisement des ressources par multiplexage abusif de requêtes HTTP/2', 'HIGH', 7.5, 'IN_PROGRESS', NOW() - INTERVAL '3 days'),
                    ('CVE-2024-21626', 'Évasion de conteneur runc', 'Fuite de descripteur de fichier permettant de sortir du conteneur', 'HIGH', 8.6, 'OPEN', NOW() - INTERVAL '2 days'),
                    ('CVE-2024-20918', 'Fuite d''informations sensibles Spring Boot Actuator', 'Exposition non autorisée des métriques internes et variables d''env', 'MEDIUM', 5.3, 'RESOLVED', NOW() - INTERVAL '10 days'),
                    ('CVE-2023-34055', 'Déni de service Spring Framework URL Parsing', 'Parsing inefficace entraînant une surconsommation CPU', 'MEDIUM', 5.9, 'OPEN', NOW() - INTERVAL '6 days'),
                    ('CVE-2022-22965', 'Spring4Shell Remote Code Execution', 'RCE via liaison de paramètres DataBinder', 'CRITICAL', 9.8, 'RESOLVED', NOW() - INTERVAL '30 days'),
                    ('CVE-2024-21893', 'Contournement d''authentification Ivanti Connect Secure', 'Vulnérabilité SSRF permettant de contourner les contrôles d''accès', 'CRITICAL', 8.2, 'OPEN', NOW() - INTERVAL '1 day'),
                    ('CVE-2023-28708', 'Attaque par canal auxiliaire Apache Tomcat', 'Transmission non sécurisée de cookies SessionID', 'LOW', 3.7, 'OPEN', NOW() - INTERVAL '15 days')
                """);
            }
        } catch (Exception e) {
            log.warn("Dashboard seeding warning (non-fatal): {}", e.getMessage());
        }
    }
}
