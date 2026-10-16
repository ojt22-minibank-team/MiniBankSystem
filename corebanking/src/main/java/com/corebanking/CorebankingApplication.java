package com.corebanking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class CorebankingApplication {

	public static void main(String[] args) {
		SpringApplication.run(CorebankingApplication.class, args);
	}

}
