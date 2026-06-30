package com.credora.service;

import com.credora.model.User;
import com.credora.model.UserToken;
import com.credora.repository.UserTokenRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class TokenService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private final UserTokenRepository tokenRepository;

    public TokenService(UserTokenRepository tokenRepository) {
        this.tokenRepository = tokenRepository;
    }

    @Transactional
    public String createToken(User user, String type, long ttlSeconds) {
        String raw = UUID.randomUUID() + "-" + randomBytes(16);
        UserToken token = new UserToken();
        token.setUser(user);
        token.setTokenHash(hash(raw));
        token.setTokenType(type);
        token.setExpiresAt(Instant.now().plusSeconds(ttlSeconds));
        tokenRepository.save(token);
        return raw;
    }

    @Transactional
    public User consumeToken(String raw, String type) {
        UserToken token = tokenRepository.findByTokenHashAndTokenType(hash(raw), type)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired token"));
        if (token.getUsedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token already used");
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token expired");
        }
        token.setUsedAt(Instant.now());
        tokenRepository.save(token);
        return token.getUser();
    }

    private String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private String randomBytes(int len) {
        byte[] bytes = new byte[len];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}
