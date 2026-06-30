package com.credora.repository;

import com.credora.model.ApplicationNote;
import com.credora.model.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ApplicationNoteRepository extends JpaRepository<ApplicationNote, Long> {
    List<ApplicationNote> findByApplicationOrderByCreatedAtDesc(LoanApplication application);
}
