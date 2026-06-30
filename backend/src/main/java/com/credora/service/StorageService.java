package com.credora.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import jakarta.annotation.PostConstruct;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);
    private static final long MAX_FILE_BYTES = 10 * 1024 * 1024;

    @Value("${credora.storage.mode:local}")
    private String storageMode;

    @Value("${credora.storage.bucket:credora-docs}")
    private String bucket;

    @Value("${credora.storage.endpoint:}")
    private String endpoint;

    @Value("${credora.storage.access-key:}")
    private String accessKey;

    @Value("${credora.storage.secret-key:}")
    private String secretKey;

    @Value("${credora.storage.region:us-east-1}")
    private String region;

    @PostConstruct
    void ensureBucket() {
        if (!"s3".equals(storageMode)) return;
        try (S3Client client = buildClient()) {
            try {
                client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
            } catch (Exception e) {
                client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
                log.info("Created storage bucket: {}", bucket);
            }
        } catch (Exception e) {
            log.warn("Could not ensure bucket {}: {}", bucket, e.getMessage());
        }
    }

    public StoredFile store(String documentType, String fileName, String contentType, String contentBase64) {
        byte[] bytes = decodeBase64(contentBase64);
        scanFile(bytes, fileName, contentType);

        String sha256 = sha256(bytes);
        String key = "documents/" + documentType + "/" + UUID.randomUUID() + "/" + sanitize(fileName);

        if ("s3".equals(storageMode)) {
            uploadToS3(key, bytes, contentType);
            return new StoredFile(key, bytes.length, sha256, null);
        }
        // local mode: keep base64 in DB as fallback
        return new StoredFile(null, bytes.length, sha256, Base64.getEncoder().encodeToString(bytes));
    }

    public String getSignedUrl(String storageKey) {
        if (storageKey == null || !"s3".equals(storageMode)) return null;
        try (S3Presigner presigner = buildPresigner()) {
            GetObjectPresignRequest req = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(15))
                    .getObjectRequest(b -> b.bucket(bucket).key(storageKey))
                    .build();
            return presigner.presignGetObject(req).url().toString();
        }
    }

    public byte[] download(String storageKey) {
        if (!"s3".equals(storageMode)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Object storage not configured");
        }
        try (S3Client client = buildClient()) {
            return client.getObjectAsBytes(GetObjectRequest.builder().bucket(bucket).key(storageKey).build()).asByteArray();
        }
    }

    private void uploadToS3(String key, byte[] bytes, String contentType) {
        try (S3Client client = buildClient()) {
            client.putObject(PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(contentType)
                            .build(),
                    RequestBody.fromBytes(bytes));
            log.info("Stored document at s3://{}/{}", bucket, key);
        }
    }

    private S3Client buildClient() {
        var builder = S3Client.builder().region(Region.of(region));
        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint)).forcePathStyle(true);
        }
        if (accessKey != null && !accessKey.isBlank()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey, secretKey)));
        }
        return builder.build();
    }

    private S3Presigner buildPresigner() {
        var builder = S3Presigner.builder().region(Region.of(region));
        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }
        if (accessKey != null && !accessKey.isBlank()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey, secretKey)));
        }
        return builder.build();
    }

    private void scanFile(byte[] bytes, String fileName, String contentType) {
        if (bytes.length > MAX_FILE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File exceeds 10MB limit");
        }
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".exe") || lower.endsWith(".bat") || lower.endsWith(".sh") || lower.endsWith(".js")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File type not allowed");
        }
        if (contentType != null && contentType.contains("javascript")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File type not allowed");
        }
    }

    private byte[] decodeBase64(String contentBase64) {
        try {
            String data = contentBase64.contains(",") ? contentBase64.split(",")[1] : contentBase64;
            return Base64.getDecoder().decode(data);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file encoding");
        }
    }

    private String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (Exception e) {
            return null;
        }
    }

    private String sanitize(String name) {
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    public record StoredFile(String storageKey, long fileSize, String sha256, String contentBase64) {}
}
