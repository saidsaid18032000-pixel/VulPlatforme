package com.vulnplatform.auth.dto;

import java.util.List;
import java.util.UUID;

public class RoleResponse {

    private UUID id;
    private String name;
    private String description;
    private List<String> permissions;

    public RoleResponse() {}

    public RoleResponse(UUID id, String name, String description, List<String> permissions) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.permissions = permissions;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getPermissions() { return permissions; }
    public void setPermissions(List<String> permissions) { this.permissions = permissions; }
}
