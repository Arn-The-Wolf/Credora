package com.credora.service;

import com.credora.model.CollateralAsset;
import com.credora.model.LoanApplication;
import com.credora.repository.CollateralAssetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class CollateralService {

    private final CollateralAssetRepository collateralRepository;

    public CollateralService(CollateralAssetRepository collateralRepository) {
        this.collateralRepository = collateralRepository;
    }

    @Transactional
    public List<CollateralAsset> persistFromSectorDetails(LoanApplication app, Map<String, String> details) {
        collateralRepository.deleteByApplication(app);
        List<CollateralAsset> assets = buildAssets(app.getLoanType(), details);
        for (CollateralAsset asset : assets) {
            asset.setApplication(app);
            collateralRepository.save(asset);
        }
        return assets;
    }

    public List<CollateralAsset> getForApplication(LoanApplication app) {
        return collateralRepository.findByApplication(app);
    }

    public String buildSummary(String loanType, Map<String, String> details) {
        if (details == null || details.isEmpty()) return "Unsecured";
        return switch (loanType != null ? loanType.toLowerCase() : "personal") {
            case "mortgage" -> String.format("Property: %s (%s) — title %s, parcel %s",
                    details.getOrDefault("propertyAddress", "—"),
                    details.getOrDefault("propertyType", "—"),
                    details.getOrDefault("titleNumber", "pending"),
                    details.getOrDefault("parcelId", "pending"));
            case "auto" -> String.format("Vehicle: %s %s %s — VIN %s, reg %s",
                    details.getOrDefault("vehicleYear", ""),
                    details.getOrDefault("vehicleMake", ""),
                    details.getOrDefault("vehicleModel", ""),
                    details.getOrDefault("vin", "pending"),
                    details.getOrDefault("registrationNumber", "pending"));
            case "business" -> {
                String ctype = details.getOrDefault("collateralType", "none");
                if ("none".equalsIgnoreCase(ctype) || ctype.isBlank()) yield "Unsecured business loan";
                yield String.format("Secured: %s — %s (est. KES %s)",
                        ctype, details.getOrDefault("collateralDescription", "—"),
                        details.getOrDefault("collateralValue", "0"));
            }
            case "education" -> {
                String cosigner = details.getOrDefault("cosignerName", "");
                if (cosigner.isBlank()) yield "Unsecured education loan — " + details.getOrDefault("institutionName", "");
                yield String.format("Cosigner: %s (%s) — %s",
                        cosigner, details.getOrDefault("cosignerRelationship", "guarantor"),
                        details.getOrDefault("institutionName", ""));
            }
            default -> "Unsecured personal loan";
        };
    }

    private List<CollateralAsset> buildAssets(String loanType, Map<String, String> d) {
        List<CollateralAsset> list = new ArrayList<>();
        if (d == null) return list;
        switch (loanType != null ? loanType.toLowerCase() : "personal") {
            case "mortgage" -> {
                CollateralAsset a = base("real_property", d.get("propertyAddress"), parse(d.get("propertyValue")));
                a.setIdentifier(d.get("titleNumber"));
                a.setMetadata(jsonKv("parcelId", d.get("parcelId"), "occupancy", d.get("occupancyType")));
                list.add(a);
            }
            case "auto" -> {
                String desc = d.get("vehicleYear") + " " + d.get("vehicleMake") + " " + d.get("vehicleModel");
                CollateralAsset a = base("vehicle", desc.trim(), parse(d.get("vehiclePrice")));
                a.setIdentifier(d.get("vin"));
                a.setMetadata(jsonKv("registration", d.get("registrationNumber"), "odometer", d.get("odometer"), "condition", d.get("vehicleCondition")));
                list.add(a);
            }
            case "business" -> {
                String ctype = d.getOrDefault("collateralType", "none");
                if (!ctype.isBlank() && !"none".equalsIgnoreCase(ctype)) {
                    CollateralAsset a = base(ctype, d.get("collateralDescription"), parse(d.get("collateralValue")));
                    a.setIdentifier(d.get("businessRegistration"));
                    list.add(a);
                }
            }
            case "education" -> {
                if (d.get("cosignerName") != null && !d.get("cosignerName").isBlank()) {
                    CollateralAsset a = base("cosigner", d.get("cosignerName"), parse(d.get("cosignerIncome")));
                    a.setIdentifier(d.get("cosignerIdNumber"));
                    a.setMetadata(jsonKv("relationship", d.get("cosignerRelationship"), "phone", d.get("cosignerPhone")));
                    list.add(a);
                }
            }
            default -> { }
        }
        return list;
    }

    private CollateralAsset base(String type, String desc, BigDecimal value) {
        CollateralAsset a = new CollateralAsset();
        a.setCollateralType(type);
        a.setDescription(desc);
        a.setEstimatedValue(value);
        a.setLienStatus("PENDING");
        return a;
    }

    private BigDecimal parse(String v) {
        if (v == null || v.isBlank()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(v.replace(",", "").replace("KES", "").trim());
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private String jsonKv(String... pairs) {
        StringBuilder sb = new StringBuilder("{");
        for (int i = 0; i < pairs.length; i += 2) {
            if (i > 0) sb.append(",");
            sb.append("\"").append(pairs[i]).append("\":\"").append(pairs[i + 1] != null ? pairs[i + 1] : "").append("\"");
        }
        return sb.append("}").toString();
    }
}
