package com.credora.repository;

import com.credora.model.CollateralAsset;
import com.credora.model.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CollateralAssetRepository extends JpaRepository<CollateralAsset, Long> {
    List<CollateralAsset> findByApplication(LoanApplication application);
    void deleteByApplication(LoanApplication application);
}
