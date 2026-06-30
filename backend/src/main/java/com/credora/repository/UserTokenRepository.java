package com.credora.repository;

import com.credora.model.UserToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserTokenRepository extends JpaRepository<UserToken, Long> {
    Optional<UserToken> findByTokenHashAndTokenType(String tokenHash, String tokenType);
}
