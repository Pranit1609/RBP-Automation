pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.50.0-jammy'
            args '-u root'
        }
    }

    parameters {
        choice(name: 'PROJECT', choices: ['demo-rbp', 'project-a', 'project-b'], description: 'Select RBP Project Configuration to test')
        string(name: 'CREDENTIALS_ID_EMPLOYEE', defaultValue: 'rbp-employee-creds', description: 'Jenkins Credential ID for Employee')
        string(name: 'CREDENTIALS_ID_MANAGER', defaultValue: 'rbp-manager-creds', description: 'Jenkins Credential ID for Manager')
        booleanParam(name: 'SIMULATE_BAD_RBP', defaultValue: false, description: 'Simulate BAD RBP mode to verify security alert detection')
    }

    environment {
        NODE_ENV = 'ci'
        PROJECT = "${params.PROJECT}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Load Credentials & Run Tests') {
            steps {
                withCredentials([
                    usernamePassword(credentialsId: "${params.CREDENTIALS_ID_EMPLOYEE}", usernameVariable: 'USER1_EMAIL', passwordVariable: 'USER1_PASSWORD'),
                    usernamePassword(credentialsId: "${params.CREDENTIALS_ID_MANAGER}", usernameVariable: 'USER2_EMAIL', passwordVariable: 'USER2_PASSWORD')
                ]) {
                    script {
                        def badFlag = params.SIMULATE_BAD_RBP ? '--bad-rbp' : ''
                        if (params.PROJECT == 'demo-rbp') {
                            sh 'npx tsx src/mock/server.ts &'
                            sh 'sleep 3'
                        }
                        sh "npx tsx src/cli/index.ts test --project ${params.PROJECT} ${badFlag}"
                    }
                }
            }
        }
    }

    post {
        always {
            junit testResults: 'reports/junit-results.xml', allowEmptyResults: true
            archiveArtifacts artifacts: 'reports/**/*, playwright-report/**/*', allowEmptyArchive: true
            allure reportBuildPolicy: 'ALWAYS', results: [[path: 'allure-results']]
        }
        success {
            echo "RBP Permission Security Validation Passed for project ${params.PROJECT}!"
        }
        failure {
            echo "ALERT: RBP Permission Security Validation Failed for project ${params.PROJECT}!"
        }
    }
}
