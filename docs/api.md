# API Documentation Outline

## Introduction
- Overview of the API
- Authentication and Authorization
- Base URL and Versioning

## General Information
- Request and Response Format
- HTTP Status Codes
- Error Handling

## Endpoints

### 1. **Project Submission Form**
- **GET /**: Retrieve public facing form page
- **GET /home**: Retrieve public facing form page


### 2. **Project Management**

### 2.1 **Project Retrieval**
- **GET /faculty**: View all projects (internal facing, auth required)
- **POST /faculty/Search**: Retrieve projects given specific search criteria
- **GET /allinformation/:projectid**: View specific project information

### 2.2 **Project Modification**
- **POST /project**: Create project
- **POST /allinformation/statusupdate/:projectid**: Update project status
- **POST /allinformation/delete/:projectid**: Delete project
- **POST /allinformation/deleteDep/:projectid**: Delete department from project
- **POST /allinformation/addDep/:projectid**: Add department to project

### 2.3 **Project Submission**
- **GET /addProject**: Internal facing form for project submission
- **POST /addProject**: Add project to database
- **GET /thankYou**: Thank you page after project submission

### 3. **Authentication**
- **GET /login**: User login
- **GET /oauth/callback**: Directs user to /faculty page if successful login, otherwise directs user back to /login
- **GET /logout**: User logout

