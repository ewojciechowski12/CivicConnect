const sqlite3 = require('sqlite3');
 
class DBAbstraction {
	constructor(fileName) {
    	this.fileName = fileName;
	}
	init() {
    	return new Promise((resolve, reject) => {
        	this.db = new sqlite3.Database(this.fileName, (err) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve();
            	}
        	});
    	});
	}
 
	insertProjectDepartment(departmentID, projectID){
		const sql = 'INSERT INTO ProjectDepartment (departmentID, projectID) VALUES (?, ?)';
		return new Promise((resolve, reject) => { 
            this.db.run(sql, [departmentID, projectID], (err) => {                 
                if(err) { 
                    reject(err); 
                } else { 
                    resolve(); 
                } 
            }); 
        }); 
	}

    // insertCompany function with improved error handling and returning companyID
    insertCompany(cname, street, city, state, zip, first, last, phone, email, web) {
        const sql = `
            INSERT OR IGNORE INTO Company (name, street, city, state, zip, first, last, phone, email, companyWeb)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
        return new Promise((resolve, reject) => {
            this.db.run(sql, [cname, street, city, state, zip, first, last, phone, email, web], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID); // Return the ID of the inserted row
                }
            });
        });
    }

   insertProject(Description, pStatus, endDate, createDate, id, startDate) 
    {
        
        const sql = 'INSERT OR IGNORE INTO Project (Description, pstatus, endDate, createDate, CompanyID, startDate) VALUES (?, ?, ?, ?, ?, ?);';
        
        return new Promise((resolve, reject) => { 
            this.db.run(sql, [Description, pStatus, endDate, createDate, id, startDate], (err) => {                 
                if(err) { 
                    reject(err); 
                } else { 
                    resolve(); 
                } 
            }); 
        });
    }

    // getCompanyID function with case insensitivity
    getCompanyID(name, fname, lname) {
        const sql = `
            SELECT companyID
            FROM Company
            WHERE name = ? COLLATE NOCASE
            AND first = ? COLLATE NOCASE
            AND last = ? COLLATE NOCASE;
        `;
        return new Promise((resolve, reject) => {
            this.db.get(sql, [name, fname, lname], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? row.companyID : null); // Return null if no company found
                }
            });
        });
    }

	getDepartmentID(name) {
		const sql = `
			SELECT Department.departmentID
			from Department
			WHERE Department.depName = ? COLLATE NOCASE; 
		`;

		return new Promise((resolve, reject) => {
			this.db.get(sql, [name], (err, row) => {
				if (err) {
					reject(err);
				} else {
					resolve(row ? row.companyID : null);
				}
			});
		});
	}

    insertUser(first, last, role, email, phone) 
    {
        const sql = 'INSERT INTO User (first, last, role, email, phone) VALUES (?, ?, ?, ?, ?, ?);';
        return new Promise((resolve, reject) => { 
            this.db.run(sql, [first, last, role, email, phone], (err) => {                 
                if(err) { 
                    reject(err); 
                } else { 
                    resolve(); 
                } 
            }); 
        }); 
    }

	getAllProjects()
	{
    	const sql = `
		SELECT Company.name, Company.first, Company.last, Project.Description, Project.createDate, Project.pstatus, Department.depName, Project.projectID
		FROM Project, Company, Department, ProjectDepartment
		WHERE Project.CompanyID = Company.companyID
		AND Project.projectID = ProjectDepartment.projectID
		AND Department.departmentID = ProjectDepartment.departmentID
        ORDER BY Department.depName
		;`;

    	return new Promise((resolve, reject) => {
        	this.db.all(sql, [], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

	getAllProjectsFiltered(keyword, startDate, endDate, status) {
		// Start building the SQL query
		let sql = `
			SELECT Company.name, Company.first, Company.last,
				Project.Description, Project.createDate, Project.pstatus,
				Department.depName, Project.projectID
			FROM Project
			JOIN Company ON Project.CompanyID = Company.companyID
			JOIN ProjectDepartment ON Project.projectID = ProjectDepartment.projectID
			JOIN Department ON ProjectDepartment.departmentID = Department.departmentID
			WHERE 1=1
		`;

		const params = [];

		// Keyword search (applies to multiple fields)
		if (keyword) {
			sql += `
			AND (
				Department.depName LIKE ? COLLATE NOCASE
				OR Project.pstatus LIKE ? COLLATE NOCASE
				OR Project.Description LIKE ? COLLATE NOCASE
				OR Company.Name LIKE ? COLLATE NOCASE
				OR Company.first LIKE ? COLLATE NOCASE
				OR Project.projectID LIKE ? COLLATE NOCASE
			)
			`;
			const kw = `%${keyword}%`;
			params.push(kw, kw, kw, kw, kw, kw);
		}

		// Status filter
		if (status) {
			sql += ` AND Project.pstatus = ? `;
			params.push(status);
		}

		// Date range filter
		if (startDate) {
			sql += ` AND date(substr(Project.createDate, 1, 10)) >= date(?) `;
			params.push(startDate);
		}
		if (endDate) {
			sql += ` AND date(substr(Project.createDate, 1, 10)) <= date(?) `;
			params.push(endDate);
		}

		sql += ` GROUP BY Project.projectID ORDER BY Project.createDate DESC; `;

		return new Promise((resolve, reject) => {
			this.db.all(sql, params, (err, rows) => {
				if (err) reject(err);
				else resolve(rows);
			});
		});
	}




	getAllProjectsSortByCompany()
	{
    	const sql = `
		SELECT Company.name, Company.first, Company.last, Project.Description, Project.createDate, Project.pstatus, Department.depName, Project.projectID
		FROM Project, Company, Department, ProjectDepartment
		WHERE Project.CompanyID = Company.companyID
		AND Project.projectID = ProjectDepartment.projectID
		AND Department.departmentID = ProjectDepartment.departmentID
		GROUP BY Project.projectID
		ORDER BY Company.name;
		;`;

    	return new Promise((resolve, reject) => {
        	this.db.all(sql, [], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

    getAllProjectsReverseSortByCompany()
	{
    	const sql = `
		SELECT Company.name, Company.first, Company.last, Project.Description, Project.createDate, Project.pstatus, Department.depName, Project.projectID
		FROM Project, Company, Department, ProjectDepartment
		WHERE Project.CompanyID = Company.companyID
		AND Project.projectID = ProjectDepartment.projectID
		AND Department.departmentID = ProjectDepartment.departmentID
		GROUP BY Project.projectID
		ORDER BY Company.name DESC;
		;`;

    	return new Promise((resolve, reject) => {
        	this.db.all(sql, [], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

	getAllProjectsSortByDate()
	{
    	const sql = `
		SELECT Company.name, Company.first, Company.last, Project.Description, Project.createDate, Project.pstatus, Department.depName, Project.projectID
		FROM Project, Company, Department, ProjectDepartment
		WHERE Project.CompanyID = Company.companyID
		AND Project.projectID = ProjectDepartment.projectID
		AND Department.departmentID = ProjectDepartment.departmentID
		GROUP BY Project.projectID
		ORDER BY Project.ProjectID
		;`;

    	return new Promise((resolve, reject) => {
        	this.db.all(sql, [], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

    getAllProjectsReverseSortByDate()
	{
    	const sql = `
		SELECT Company.name, Company.first, Company.last, Project.Description, Project.createDate, Project.pstatus, Department.depName, Project.projectID
		FROM Project, Company, Department, ProjectDepartment
		WHERE Project.CompanyID = Company.companyID
		AND Project.projectID = ProjectDepartment.projectID
		AND Department.departmentID = ProjectDepartment.departmentID
		GROUP BY Project.projectID
		ORDER BY Project.ProjectID DESC
		;`;

    	return new Promise((resolve, reject) => {
        	this.db.all(sql, [], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

    getAllProjectsSortByStatus()
	{
    	const sql = `
		SELECT Company.name, Company.first, Company.last, Project.Description, Project.createDate, Project.pstatus, Department.depName, Project.projectID
		FROM Project, Company, Department, ProjectDepartment
		WHERE Project.CompanyID = Company.companyID
		AND Project.projectID = ProjectDepartment.projectID
		AND Department.departmentID = ProjectDepartment.departmentID
		GROUP BY Project.projectID
		ORDER BY project.pstatus
		;`;

    	return new Promise((resolve, reject) => {
        	this.db.all(sql, [], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}


	getAllProjectsReverseSortByStatus()
	{
    	const sql = `
		SELECT Company.name, Company.first, Company.last, Project.Description, Project.createDate, Project.pstatus, Department.depName, Project.projectID
		FROM Project, Company, Department, ProjectDepartment
		WHERE Project.CompanyID = Company.companyID
		AND Project.projectID = ProjectDepartment.projectID
		AND Department.departmentID = ProjectDepartment.departmentID
		GROUP BY Project.projectID
		ORDER BY project.pstatus DESC
		;`;

    	return new Promise((resolve, reject) => {
        	this.db.all(sql, [], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}



	getAllProjectsSortByDepartment()
	{
    	const sql = `
		SELECT Company.name, Company.first, Company.last, Project.Description, Project.createDate, Project.pstatus, Department.depName, Project.projectID
		FROM Project, Company, Department, ProjectDepartment
		WHERE Project.CompanyID = Company.companyID
		AND Project.projectID = ProjectDepartment.projectID
		AND Department.departmentID = ProjectDepartment.departmentID
		GROUP BY Project.projectID
		ORDER BY Department.depName
		;`;

    	return new Promise((resolve, reject) => {
        	this.db.all(sql, [], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});	
	}

    getAllProjectsReverseSortByDepartment()
	{
    	const sql = `
		SELECT Company.name, Company.first, Company.last, Project.Description, Project.createDate, Project.pstatus, Department.depName, Project.projectID
		FROM Project, Company, Department, ProjectDepartment
		WHERE Project.CompanyID = Company.companyID
		AND Project.projectID = ProjectDepartment.projectID
		AND Department.departmentID = ProjectDepartment.departmentID
		GROUP BY Project.projectID
		ORDER BY Department.depName DESC
		;`;

    	return new Promise((resolve, reject) => {
        	this.db.all(sql, [], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

    getAllInformationByProjectID(proID)
	{
		if(!Number.isInteger(proID)) { 
            return null; 
        }
		 
    	const sql = `
		SELECT Project.projectID, Project.Description, Project.pstatus, Project.endDate, Project.startDate, Project.createDate, Company.name, Company.street, Company.city, Company.state, Company.zip, Company.first, Company.last, Company.phone, Company.email, Company.companyWeb, Department.depName, Department.head, Department.depEmail, Department.departmentID
		FROM Project, Company, Department, ProjectDepartment
		WHERE Project.CompanyID = Company.companyID 
		AND Project.projectID = ?
		AND Project.projectID = ProjectDepartment.projectID 
		AND Department.departmentID = ProjectDepartment.departmentID
		;`;

    	return new Promise((resolve, reject) => {
        	this.db.all(sql, [proID], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}	

	updateProjectStatus(pStatus, proID)
    {
   	 const sql = `
   	 UPDATE Project
   	 SET pstatus = ?   	 
   	 WHERE projectID = ? COLLATE NOCASE;
   	 `;

    
   	 return new Promise((resolve, reject) => {
   		 this.db.run(sql, [pStatus, proID], (err) => {            	 
            	if(err) {
                	reject(err);
            	} else {
                	resolve();
            	}
        	});
   	 });

    }
	deleteProject(proID)
    {
   	 const sql = `
   		DELETE FROM ProjectDepartment
		WHERE projectID = ? COLLATE NOCASE;

		DELETE FROM Project
		WHERE projectID = ? COLLATE NOCASE;
   	 `;

   	 return new Promise((resolve, reject) => {
   		 this.db.run(sql, [proID], (err) => {            	 
            	if(err) {
                	reject(err);
            	} else {
                	resolve();
            	}
        	});
   	 });

    }

	deleteProjectDep(proID, depID)
    {
   	 const sql = `
   		DELETE FROM ProjectDepartment 
		WHERE ProjectDepartment.projectID = ? COLLATE NOCASE
		AND ProjectDepartment.departmentID = ? COLLATE NOCASE;
   	 `;

   	 return new Promise((resolve, reject) => {
   		 this.db.run(sql, [proID, depID], (err) => {            	 
            	if(err) {
                	reject(err);
            	} else {
                	resolve();
            	}
        	});
   	 });
    }
    
deleteUnusedCompany()
{
    const sql = `
    DELETE FROM company
    WHERE NOT EXISTS (
        SELECT 1 
        FROM project 
        WHERE project.companyId = company.companyId
    );`;

    return new Promise((resolve, reject) => {
        this.db.run(sql, [], (err) => {            	 
            if(err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
	getCompanyByName(cname)
	{
    	const sql = `
        	SELECT name, street, city, state, zip, rfirst, rlast, phone, email
        	FROM Company
        	WHERE name = ? COLLATE NOCASE;
    	`;
    	return new Promise((resolve, reject) => {
        	this.db.get(sql, [cname], (err, row) => {            	 
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

	getCompanyByCity(city)
	{
    	const sql = `
        	SELECT name, street, city, state, zip, ContactFirst, ContactLast, phone, email
        	FROM Company
        	WHERE city = ? COLLATE NOCASE;
    	`;
    	return new Promise((resolve, reject) => {
        	this.db.get(sql, [city], (err, row) => {            	 
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

	getUserByLastName(last)
	{
    	const sql = `
        	SELECT first, last, role, email, phone
        	FROM User
        	WHERE last = ? COLLATE NOCASE;
    	`;
    	return new Promise((resolve, reject) => {
        	this.db.get(sql, [last], (err, row) => {            	 
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

    getCompanyByID(id) 
    { 
        const sql = ` 
            SELECT name, street, city, state, zip, rfirst, rlast, phone, email 
            FROM Company
            WHERE companyID = ? COLLATE NOCASE; 
        `; 
        return new Promise((resolve, reject) => { 
            this.db.get(sql, [id], (err, row) => {                 
                if(err) { 
                    reject(err); 
                } else { 
                    resolve(row); 
                } 
            });

        }); 
    } 

	getUserByid(id)
	{
    	const sql = `
        	SELECT first, last, role, email, phone
        	FROM User
        	WHERE userID = ? COLLATE NOCASE;
    	`;
    	return new Promise((resolve, reject) => {
        	this.db.get(sql, [id], (err, row) => {            	 
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

	getProjectCompanyID(id)
	{
    	const sql = `
        	SELECT companyID
        	FROM ProjectInfo
        	WHERE projectID = ? COLLATE NOCASE;
    	`;
    	return new Promise((resolve, reject) => {
        	this.db.get(sql, [id], (err, row) => {            	 
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

	getCompanyProjectID(id)
	{
    	const sql = `
        	SELECT projectID
        	FROM ProjectInfo
        	WHERE companyID = ? COLLATE NOCASE;
    	`;
    	return new Promise((resolve, reject) => {
        	this.db.get(sql, [id], (err, row) => {            	 
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}
    getProjectID(description) 
    { 
        const sql = ` 
            SELECT projectID
            FROM Project
            WHERE Description = ? COLLATE NOCASE; 
        `; 
        return new Promise((resolve, reject) => { 
            this.db.get(sql, [description], (err, row) => {                 
                if(err) { 
                    reject(err); 
                } else { 
                    resolve(row ? row.projectID : null); 
                } 
            }); 
        }); 
    }

    getCompanyProjectID(id) 
    { 
        const sql = ` 
            SELECT projectID
            FROM ProjectInfo
            WHERE companyID = ? COLLATE NOCASE; 
        `; 
        return new Promise((resolve, reject) => { 
            this.db.get(sql, [id], (err, row) => {                 
                if(err) { 
                    reject(err); 
                } else { 
                    resolve(row); 
                } 
            }); 
        }); 
    } 

	getDepartmentEmail(id)
	{
    	const sql = `
		SELECT depEmail
		FROM Department
		WHERE departmentID = ? COLLATE NOCASE;
    	`;
    	return new Promise((resolve, reject) => {
        	this.db.get(sql, [id], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

	getProjectDepartmentID(id)
	{
    	const sql = `
        	SELECT projectID
        	FROM ProjectDepartment
        	WHERE departmentID = ? COLLATE NOCASE;
    	`;
    	return new Promise((resolve, reject) => {
        	this.db.get(sql, [id], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}
	getDepartmentProjectID(id)
	{
    	const sql = `
        	SELECT departmentID
        	FROM ProjectDepartment
        	WHERE projectID = ? COLLATE NOCASE;
    	`;
    	return new Promise((resolve, reject) => {
        	this.db.get(sql, [id], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

	getDepartmentAssociationDID(id)
	{
    	const sql = `
        	SELECT departmentID
        	FROM DepartmentAssociation
        	WHERE userID = ? COLLATE NOCASE;
    	`;
    	return new Promise((resolve, reject) => {
        	this.db.get(sql, [id], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

	getDepartmentAssociationUID(id)
	{
    	const sql = `
        	SELECT userID
        	FROM DepartmentAssociation
        	WHERE departmentID = ? COLLATE NOCASE;
    	`;
    	return new Promise((resolve, reject) => {
        	this.db.get(sql, [id], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

	getUserProjectUID(id)
	{
    	const sql = `
        	SELECT userID
        	FROM UserProject
        	WHERE projectID = ? COLLATE NOCASE;
    	`;
    	return new Promise((resolve, reject) => {
        	this.db.get(sql, [id], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

	getUserProjectPID(id)
	{
    	const sql = `
        	SELECT projectID
        	FROM UserProject
        	WHERE userID = ? COLLATE NOCASE;
    	`;
    	return new Promise((resolve, reject) => {
        	this.db.get(sql, [id], (err, row) => {
            	if(err) {
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}
	
	getProjectByStatus(status)
	{
		const sql = `
			SELECT Company.name, Company.first, Company.last, Project.Description, Project.createDate, Project.pstatus, Department.depName, Project.projectID
        FROM Project
        JOIN Company ON Project.CompanyID = Company.companyID
        JOIN ProjectDepartment ON Project.projectID = ProjectDepartment.projectID
        JOIN Department ON ProjectDepartment.departmentID = Department.departmentID
        WHERE Project.pstatus = ?
        `; 
		
		return new Promise((resolve, reject) => {
        	this.db.all(sql, [status], (err, row) => {
            	if(err) {					
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}

	//Verify that Department Exists
	getDepartmentIDbyID(id) {
		const sql = `
			SELECT Department.departmentID
			from Department
			WHERE Department.departmentID = ?;
		`;

		return new Promise((resolve, reject) => {
			this.db.get(sql, [name], (err, row) => {
				if (err) {
					reject(err);
				} else {
					resolve(row ? row.companyID : null);
				}
			});
		});
	}

	getAllDepartments(){
		const sql=`
		SELECT Department.departmentID, Department.depName
		from Department`

		return new Promise((resolve, reject) => {
        	this.db.all(sql, [], (err, row) => {
            	if(err) {					
                	reject(err);
            	} else {
                	resolve(row);
            	}
        	});
    	});
	}	
	

}
module.exports = DBAbstraction;