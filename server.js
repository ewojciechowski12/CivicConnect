'use strict'

/*####################################################################################################################################
########################################################################################################################################

                                      Code Break 1

########################################################################################################################################
########################################################################################################################################*/


// all emails are listed in order of their value in the index.html code break 1 section.
var emailAddresses= [/*1*/"adassow@carthage.edu", /*2*/"nscharnick@carthage.edu", /*3*/"sobrien3@carthage.edu", /*4*/"rbingen@carthage.edu", 
  /*5*/"rnagel@carthage.edu",/*6*/"srubinfeld@carthage.edu", /*7*/"wsun@carthage.edu", /*8*/"jmast@carthage.edu", /*9*/"lhuaracha@carthage.edu", 
  /*10*/"ljensen@carthage.edu", /*11*/"smitchell@carthage.edu",/*12*/"jtenuta@carthage.edu", /*13*/"fig23_civic_engagement@carthage.edu" , 
  /*14*/"cpalmer5@carthage.edu", /*15*/"rmatthews@carthage.edu"]
 

/*####################################################################################################################################
########################################################################################################################################

                                      End of Code Break 1

########################################################################################################################################
########################################################################################################################################*/
const express = require('express');
const fileUpload = require('express-fileupload')
const morgan = require('morgan');
const bodyParser = require("body-parser");
const cors = require('cors');
const _ = require('lodash');
const DBAbstraction = require('./DBAbstraction');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require("nodemailer");
const process = require('process');
const db = new DBAbstraction('software_Data.db'); 
const passport = require('passport');
const OneLoginStrategy = require('passport-openidconnect').Strategy;
const session = require('express-session');
const { date } = require('assert-plus');
require('dotenv').config();
const router = express.Router();

const USE_DEMO_AUTH = true; //TO DO - set false before production

const ROLES = {
  VIEWER: 'viewer',
  FACULTY: 'faculty',
  ADMIN: 'admin'
};

const app = express(); 
//let transporter = nodemailer.createTransport(options[, defaults])
const handlebars = require('express-handlebars').create({defaultLayout: 'main'});
var sortComp = false;
var sortDate = false;
var sortStat = false;
var sortDep = true;

app.use(cors());
app.engine('handlebars', handlebars.engine); 
app.set('view engine', 'handlebars');
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'Public'))); 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

handlebars.handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});


// Configure session middleware
app.use(session({
    secret: 'secret squirrel',
    resave: false,
    saveUninitialized: true
  }));

// Configure Passport.js
passport.use(new OneLoginStrategy({
    issuer: process.env.OIDC_BASE_URI,
    clientID: process.env.OIDC_CLIENT_ID,    
    clientSecret: process.env.OIDC_CLIENT_SECRET,    
    authorizationURL: process.env.OIDC_BASE_URI + '/auth',
    userInfoURL: process.env.OIDC_BASE_URI + '/me',
    tokenURL : process.env.OIDC_BASE_URI + '/token',
    callbackURL: process.env.OIDC_REDIRECT_URI,
    passReqToCallback: true
  }, (req, issuer, userId, profile, accessToken, refreshToken, params, cb) => {
    // Save tokens to session
    req.session.accessToken = accessToken;
    req.session.idToken = params['id_token'];
    return cb(null, profile);
  }));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Middleware to check roles
function requireRole(allowedRoles){
  return function(req, res, next){
    if(!req.user || !allowedRoles.includes(req.user.role)){
      return res.status(403).send('Access denied');
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────────
//  DEMO AUTHENTICATION SETUP
// ─────────────────────────────────────────────────────────────
let ensureAuthenticated;

if (USE_DEMO_AUTH) {
  // DEMO AUTH - Remove before production
  const { setupDemoAuth, demoAuthMiddleware } = require('./demoAuth');
  setupDemoAuth(app);
  
  ensureAuthenticated = function(req, res, next) {
    return demoAuthMiddleware(req, res, next);
  };
  
  console.log('⚠️  RUNNING IN DEMO AUTH MODE - NOT FOR PRODUCTION ⚠️');
} else {
  // PRODUCTION AUTH - OneLogin OIDC
  const passport = require('passport');
  const OpenIDConnectStrategy = require('passport-openidconnect').Strategy;
  
  // ... (your existing Passport setup)
  
  app.use(passport.initialize());
  app.use(passport.session());
  
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
  }
  
  // OneLogin routes
  app.get('/login', passport.authenticate('openidconnect', {
    successReturnToOrRedirect: '/faculty',
    scope: 'profile'
  }));
  
  app.get('/oauth/callback', 
    passport.authenticate('openidconnect', { failureRedirect: '/login' }),
    (req, res) => {
      req.session.accessToken = req.authInfo.access_token;
      req.session.idToken = req.query.id_token;
      res.redirect('/faculty');
    }
  );
  
  app.get('/logout', (req, res) => {
    req.logout(() => {
      res.redirect('/login');
    });
  });
}


// Function to map ids of departments from project submission to ids of hardcoded emails
function addresses(ids){
  var email = "";
  if(ids && ids.length > 0){
    for (var i = 0; i < ids.length; i++) {
      email += emailAddresses[ids[i] - 1];
      if(i < ids.length - 1){
        email+=  ", ";
      }
    }
  }
  return email;
}


// user is the email that is controlling the account of which all automated emails will be sent from.
var USER = process.env.SMTP_EMAIL; //  fig23_civic_engagement@carthage.edu is an available email to be used for the account.

// to generate the password for the account go to myaccount.google.com >> Security >> 2-Step Verification (account must have 2-Step verification enabled.)
// then open App Passwords at the bottom of the page and name the application. copy the generated password and past in the space below.
var PASS = process.env.SMTP_PASS; 

async function mailer(bodyParser) {
  // email body setup using HTML tags.
  const output = `
    <p>You have a new project request</p>
    <h3>Contact details</h3>
    <ul>
      <li>Name: ${bodyParser.fname} ${bodyParser.lname}</li>
      <li>Company: ${bodyParser.OrgName}</li>
      <li>Email: ${bodyParser.email}</li>
    </ul>
    <h3>Project description</h3>
    <p>${bodyParser.Description}</p>
  `;

   // create reusable transporter object using the default SMTP transport
   let transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: USER, // provided user 
        pass: PASS  // provided password
    },
    tls:{
      rejectUnauthorized:false
    }
  });
  var emails = addresses(bodyParser.department);

  // setup email data with unicode symbols
  let mailOptions = {
/*####################################################################################################################################
########################################################################################################################################

                                      Code Break 2

########################################################################################################################################
########################################################################################################################################*/
      from: '"Civic Connect mailer" <' + USER + '>', // sender address change to the account sending the emails

      //  Switch the commented and uncommented lines below when ready to launch or change the to emails for testing. 
      to: 'ewojciechowski@carthage.edu', // list of receivers

      // include aspire in every email
      //to: emails + (emails ? ', ' : '') + 'aspire@carthage.edu',

      // email subject line can be changed here.
      subject: 'Civic Connect Request',

/*####################################################################################################################################
########################################################################################################################################

                                      Code Break 2

########################################################################################################################################
########################################################################################################################################*/
      html: output // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
          return console.log(error);
      }
      console.log('Message sent: %s', info.messageId);   
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

  });
  console.log(mailOptions);
}

/* GET form page. */
app.get('/', function(req, res, next) {
    res.render('form', { layout: false });
});

/* GET home page. */
app.get('/home', function(req, res, next) {
    res.render('form', { layout: false });
  });

// Login route
app.get('/login', passport.authenticate('openidconnect', {
    successReturnToOrRedirect: '/faculty',
    scope: 'profile'
  }));

// Callback route
app.get('/oauth/callback', passport.authenticate('openidconnect', {
    callback: true,
    successReturnToOrRedirect: '/faculty', // Redirect to faculty page after successful login
    failureRedirect: '/login'
  }));


// Destroy both the local session and
// revoke the access_token at OneLogin
app.get('/logout', function(req, res) {
    req.logout(function(err) {
        if(err) {
            // Handle error
            console.error(err);
            return res.status(500).send('Error logging out');
        }
        // Successful logout
        res.redirect('/login'); // Redirect to login
    });
});

app.post('/project', async (req, res) => { 
    const fName = req.body.fname;
    const lName = req.body.lname;
    const email = req.body.email;
    const cityTown = req.body.cityTown;
    const OrgSite = req.body.OrgSite;
    const pNumber = req.body.pNumber;
    const state = req.body.state;
    const OrgName = req.body.OrgName;
    const endDate = req.body.endDate;
    const startDate = req.body.startDate;
    const streetAddr = req.body.streetAddr;
    const zip = req.body.zip;
    const Description = req.body.Description;
    const depart = req.body.department;
    const pStatus = req.body.pStatus || "Waiting"; // default to "Waiting" if not provided
  
    try {
      await db.insertCompany(OrgName, streetAddr, cityTown, state, zip, fName, lName, pNumber, email, OrgSite);
      const companyID = await db.getCompanyID(OrgName, fName, lName);
      if (!companyID) {
        return res.json({"result": "Failed to find or make company"});
      }

      var now = new Date();
      var createDate = now.toISOString().slice(0,19).replace('T',' ');

      await db.insertProject(Description, pStatus, endDate, createDate, companyID, startDate);

      const projectID = await db.getProjectID(Description);
      if (!projectID) {
        return res.json({"result": "Failed to find or make Project"});
      }
  
      for (var i = 0; i < depart.length; i++) {
        await db.insertProjectDepartment(depart[i], projectID);
      }
  
      mailer(req.body);
  
      res.render('thankYou', { layout: 'main', title: 'Thank You'  });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  app.get('/faculty', ensureAuthenticated, async (req, res) => {
	 
    try {
       //const allProjects = await db.getAllProjectsReverseSortByDate();
       let allProjects = [];
       const sortBy = req.query.sort || 'date'; // Default to sorting by date
       const direction = req.query.direction === 'asc' ? 'asc' : 'desc'; // default to 'desc'
       const status = req.query.status;   

       switch(sortBy){

        case 'date':
          allProjects = direction === 'asc'
            ? await db.getAllProjectsSortByDate()
            : await db.getAllProjectsReverseSortByDate();
          break;

        case 'company':
          if(sortComp){
            allProjects = await db.getAllProjectsReverseSortByCompany();
            sortComp = false;
            break;
          }
          else{
              allProjects = await db.getAllProjectsSortByCompany();
              sortComp = true;
              sortDate = false;
              sortStat = false;
              sortDep = false;
              break;
          }

        case 'status':
          
          if(!status){
            if(sortStat){
                allProjects = await db.getAllProjectsReverseSortByStatus();
                sortStat = false;
                break;
            }
            else{
                allProjects = await db.getAllProjectsSortByStatus();
                sortComp = false;
                sortDate = false;
                sortStat = true;
                sortDep = false;
                break;
            }
          } else {      
            allProjects = await db.getProjectByStatus(status);
            break;      
          }

        case 'department':
          if(sortDep){
            allProjects = await db.getAllProjectsReverseSortByDepartment();
            sortDep = false;
            break;
          }
          else{
              allProjects = await db.getAllProjectsSortByDepartment();
              sortComp = false;
              sortDate = false;
              sortStat = false;
              sortDep = true;
              break;
          }

        default:
          //allProjects = await db.getAllProjectsSortByDate();
          break;
      }   
      
       //Code to display count next to tableheaders on /faculty
       const allCount = allProjects.length;
       const completeCount = allProjects.filter(p => p.pstatus === 'Complete').length;
       const incompleteCount = allProjects.filter(p => p.pstatus === 'Incomplete').length;
       const waitingCount = allProjects.filter(p => p.pstatus === 'Waiting').length;
       const archivedCount = allProjects.filter(p => p.pstatus === 'Archived').length;
      
       const filteredProj = (!status || status === 'All')
       ? allProjects
       : allProjects.filter(p => p.pstatus === status);

       
       sortDate = true;
 
       if(filteredProj && filteredProj.length > 0) {
           res.render('allProjects', {allCount,completeCount,incompleteCount,waitingCount,archivedCount, projects: filteredProj});
           
       } else {
           res.json({"results": "no projects"});
       }
     } catch (err) {
       res.json({"results": err.message});
     }
 });

 app.get('/faculty/Search', ensureAuthenticated, async (req, res) => {
  const { Search, startDate, endDate, status } = req.query;

  const allProjects = await db.getAllProjectsFiltered(Search || '', startDate, endDate, status);

  const allCount = allProjects.length;
  const completeCount = allProjects.filter(p => p.pstatus === 'Complete').length;
  const incompleteCount = allProjects.filter(p => p.pstatus === 'Incomplete').length;
  const waitingCount = allProjects.filter(p => p.pstatus === 'Waiting').length;
  const archivedCount = allProjects.filter(p => p.pstatus === 'Archived').length;

  res.render('allProjects', {
    allCount, completeCount, incompleteCount, waitingCount, archivedCount,
    projects: allProjects,
    searchText: Search || '',
    startDate: startDate || '',
    endDate: endDate || '',
    statusFilter: status || ''
  });
});

//Function to display all information when id href clicked in /faculty
app.get('/allinformation/:projectid', ensureAuthenticated, async (req, res) => {
	try {
        
    	const projectInfo = await db.getAllInformationByProjectID(Number(req.params.projectid));      
      const departments = await db.getAllDepartments();

    	if(projectInfo) {
        res.render('projectInformation', {departments, information: projectInfo });
    	} else {
        res.json({"results": "no project with id " + req.params.projectid});
    	}
	} catch (err) {
    	res.json({"results": "error"});
	}
  
});

app.post('/allinformation/statusupdate/:projectid', ensureAuthenticated, requireRole([ROLES.FACULTY, ROLES.ADMIN]), async (req, res) => {
  try {
	await db.updateProjectStatus(req.body.pStatus,Number(req.params.projectid));

  } catch (err) {
	res.json({"results": "error"});
  }
  res.redirect('/allinformation/' + req.params.projectid);
});

app.post('/allinformation/delete/:projectid', ensureAuthenticated,  requireRole([ROLES.ADMIN]), async(req, res) => {
  try {
    
      // Use projectIdToDelete to delete the project from your database
      await db.deleteProject(Number(req.params.projectid));
      await db.deleteUnusedCompany();
      
      // Redirect to the desired page after successful deletion
      res.redirect('/faculty'); // Adjust the redirect URL as needed
  } catch (error) {
      // Handle any errors that occur during deletion
      console.error('Error deleting project:', error);
      res.status(500).send('Internal Server Error'); // Respond with an appropriate error message
  }
});

//Remove Department From Project
app.post('/allinformation/deleteDep/:projectid', ensureAuthenticated, requireRole([ROLES.ADMIN]), async(req, res) => {
  try {
    
    const { departmentID } = req.body;

    if(!departmentID){
      return res.status(400).json({ error: 'Department ID required' });
    }

    const projectID = req.params.projectid;
    const result = await db.deleteProjectDep(projectID, departmentID);
    

    res.redirect(`/allinformation/${projectID}`);

    //res.json({ message: 'Department removed from project', changes: result });
      
  } catch (error) {
      // Handle any errors that occur during deletion
      console.error('Error deleting department:', error);
      res.status(500).send('Internal Server Error'); // Respond with an appropriate error message
  }
});

// Add department to project that is already created
app.post('/allinformation/addDep/:projectid', ensureAuthenticated, requireRole([ROLES.FACULTY, ROLES.ADMIN]),async(req, res) => {
  try {
    
    //var depID = db.getDepartmentID(req.params.depName);
    const { departmentID } = req.body;

    if(!departmentID){
      return res.status(400).json({ error: 'Department ID required' });
    }

    const projectID = req.params.projectid;
    const result = await db.deleteProjectDep(projectID, departmentID);
    await db.insertProjectDepartment(departmentID, projectID);

    res.redirect(`/allinformation/${projectID}`);    
      
  } catch (error) {
      // Handle any errors that occur during deletion
      console.error('Error adding department:', error);
      res.status(500).send('Internal Server Error'); // Respond with an appropriate error message
  }
});

// Page for faculty to manually add project
app.get('/addProject', ensureAuthenticated, requireRole([ROLES.FACULTY, ROLES.ADMIN]), (req, res) => {
  res.render('addProject'); 
});

app.get('/thankYou',(req, res) => {
  res.render('thankYou', { layout: 'main', title: 'Thank You'  });
});

// Push project to database from /addProject
app.post('/addProject', async (req, res) => {
  const {
    fname,
    lname,
    email,
    cityTown,    
    state,    
    OrgName,    
    streetAddr,
    zip,    
    Description,
    department,
    pStatus,
    pNumber,
    OrgSite,
    endDate,
    startDate
  } = req.body;

  try {
    // Insert new company or find existing one
    await db.insertCompany(OrgName, streetAddr, cityTown, state, zip, fname, lname, pNumber, email, OrgSite);
    const companyID = await db.getCompanyID(OrgName, fname, lname);

    if (!companyID) {
      return res.status(400).json({ result: 'Failed to find or make company' });
    }

    // Get current date/time
    const currentDate = new Date();
    const createDate = `${currentDate.getFullYear()} / ${currentDate.getMonth() + 1} / ${currentDate.getDate()} @ ${currentDate.getHours()}:${currentDate.getMinutes()}:${currentDate.getSeconds()}`;

    // Insert new project
    await db.insertProject(Description, pStatus, endDate, startDate,createDate, companyID);
    const projectID = await db.getProjectID(Description);

    if (!projectID) {
      return res.status(400).json({ result: 'Failed to find or make Project' });
    }

    // Associate departments
    for (let i = 0; i < department.length; i++) {
      await db.insertProjectDepartment(department[i], projectID);
    }

    res.json({ result: 'Project successfully submitted' });
  } catch (error) {
    console.error('Error in /addProject:', error);
    res.status(500).send('Internal Server Error');
  }
});

 
app.use((req, res) => {
	res.status(404).send(`<h2>Uh Oh!</h2><p>Sorry ${req.url} cannot be found here</p>`);
});
 
db.init()
	.then(() => {
    	// Start the server
        const port = process.env.PORT  || 53140;
        app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
        });
	})
	.catch(err => {
    	console.log('Problem setting up the database');
    	console.log(err);
	});
