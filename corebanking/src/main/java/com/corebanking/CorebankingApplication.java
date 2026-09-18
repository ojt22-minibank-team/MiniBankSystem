package com.corebanking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableAsync
public class CorebankingApplication {

	public static void main(String[] args) {
		SpringApplication.run(CorebankingApplication.class, args);
	}

}
