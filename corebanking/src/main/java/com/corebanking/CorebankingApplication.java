package com.corebanking;

import com.corebanking.config.DotenvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
@EnableAsync
public class CorebankingApplication {

	public static void main(String[] args) {
		DotenvLoader.loadIntoSystemProperties();
		SpringApplication.run(CorebankingApplication.class, args);
	}

}
