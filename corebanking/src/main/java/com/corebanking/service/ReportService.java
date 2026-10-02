package com.corebanking.service;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.springframework.stereotype.Service;
import org.springframework.util.ResourceUtils;

import com.corebanking.dto.ReportRequestDto;
import com.corebanking.dto.ReportResultDto;
import com.corebanking.repository.ReportRepository;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

@Service
public class ReportService {

    private final ReportRepository reportRepository;

    public ReportService(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    public byte[] generateTransactionReportPdf(ReportRequestDto request) throws Exception {
        // 1. SP ခေါ်ပြီး Data ယူပါ
        ReportResultDto data = reportRepository.getTransactionReport(request);

        // 2. Jasper Template ဖတ်ပါ (.jrxml file ကို src/main/resources အောက်တွင် ထားပါ)
        File file = ResourceUtils.getFile("classpath:reports/transaction_report.jrxml");
        JasperReport jasperReport = JasperCompileManager.compileReport(file.getAbsolutePath());

        // 3. Data ကို DataSource ပြောင်းပါ (Details အတွက်)
        JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(data.getDetails());

        // 4. Summary data ကို Parameters အနေဖြင့် ထည့်ပါ (Template တွင် Parameter အဖြစ် ကြေညာထားရန်လိုသည်)
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("ReportTitle", "Transaction Report");
        // Summary List ကို Table Component သို့မဟုတ် Subreport ဖြင့်ပြလိုပါက DataSource အနေဖြင့် ထည့်ပေးနိုင်သည်
        parameters.put("SummaryDataSource", new JRBeanCollectionDataSource(data.getSummaries()));

        // 5. Report ထဲ Data ဖြည့်ပါ
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);

        // 6. PDF ကို byte[] အဖြစ် Export လုပ်ပါ
        return JasperExportManager.exportReportToPdf(jasperPrint);
    }
}