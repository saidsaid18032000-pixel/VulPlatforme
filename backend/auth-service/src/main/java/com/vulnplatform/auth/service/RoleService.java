package com.vulnplatform.auth.service;

import com.vulnplatform.auth.dto.RoleResponse;
import com.vulnplatform.auth.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class RoleService {

    private final RoleRepository roleRepository;

    public RoleService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(r -> new RoleResponse(
                        r.getId(),
                        r.getName(),
                        r.getDescription(),
                        r.getPermissions() != null
                                ? r.getPermissions().stream().map(p -> p.getCode()).sorted().collect(Collectors.toList())
                                : List.of()
                ))
                .collect(Collectors.toList());
    }
}
