'use strict';

module.exports.hello = function(context, req) {
  context.res = {
      body: "Hello world!"
  }
  context.done();
};



/*'use strict';
var AWS = require('aws-sdk');
var fs = require('fs');
var stream = require('stream');
var Client = require('node-rest-client').Client;
var FormData = require('form-data');
var util = require('util');
var crypto = require('crypto');
//var dateTime = require('node-datetime');
// var moment = require('moment');
var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();
var config = require('./config.js');
var IsTableExistsOfEsignCallbackTransaction = false;
const ESIGN_CALLBACK_TRANSACTIONS_TABLE = 'EsignCallbackTransactions';
const querystring = require('querystring');
const EOL_CHAR = '\r\n';

const TABLE_NAME_AGENCY_STORE = config.table_name_agency_store; // 'AgencyStore';

const ADOBE_API_ENDPOINT_BASE = config.adobe_api_endpoint_base; // 'https://api.na1.echosign.com/api/rest/v5';
const ADOBE_CLIENT_ID = config.adobe_client_id;                 // 'CBJCHBCAABAAW4ZeWtWMUirPhutvSn1N83dDz3widaUt';
const ADOBE_CLIENT_SECRET = config.adobe_client_secret;         //'Y8EBm2w3rVs0bhjlPTklLChQppqUueJ-';
const ADOBE_REFRESH_TOKEN_SCOPES= config.adobe_refresh_token_scopes;//'agreement_send:account agreement_read:account agreement_write:account';
const ADOBE_AUTH_API_ENDPOINT = config.adobe_auth_api_endpoint; // 'https://api.echosign.com/oauth/refresh';

const CONSTRUCT_API_HOSTNAME = config.construct_api_hostname; // 'apis.dev.accela.com';
const CONSTRUCT_API_PROTOCOL = config.construct_api_protocol; //'https:';
const CONSTRUCT_API_ENDPOINT_BASE = CONSTRUCT_API_PROTOCOL + '//' + CONSTRUCT_API_HOSTNAME;
const CONSTRUCT_CLIENT_ID = config.construct_client_id; // '636147919493945241';
const CONSTRUCT_CLIENT_SECRET = config.construct_client_secret; //'5cd3608933c44e209f6b6cd58f20f67d';
const CRYPTO_PRIVATE_KEY = config.crypt_private_key;
const CRYPYO_IV = "k@^3yM#8"; // keep same value as tools

// the response object requires statusCode and body properties for api gateway routing.
// https://www.hellosign.com/api/eventsAndCallbacksWalkthrough
// Responding to callbacks
//
// Your endpoint will need to return a 200 HTTP code and a response body containing the following text:
// Hello API Event Received.
// Otherwise, the callback will be considered a failure and will be retried later.
//
const ADOBE_CALLBACK_RECEIVED_RESPONSE = {
    statusCode: 200,
    body: 'Hello API Event Received'
};

module.exports.esignCallback = adobeEsignCallbackHandler;

function adobeEsignCallbackHandler(event, context, callback) {
    var agreementid = '';
    var agencyName = '';
    var recordId = '';
    var agencyStoreEntity;
    var AA_RequestId = 'aa';
    var AA_DocumentId = '';
    var transaction_message = '';
    var startTime = new Date();

    writeLog('================ adobeEsign callback function begin ================');
    writeLog("1.request incoming" + JSON.stringify(event));

    if(!event.queryStringParameters)
    {
        writeLog('no query string.');
        callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);

        return;
    }

    writeLog("query string: " + querystring.stringify(event.queryStringParameters))
    // AARequestId
    if (event.queryStringParameters.AARequestId) {
        AA_RequestId = event.queryStringParameters.AARequestId;
    }

    if (event.queryStringParameters.AADocumentId) {
        AA_DocumentId = event.queryStringParameters.AADocumentId;
    }

    //writeLog("AA RequestId: " + AA_RequestId + ", AA DocumentId: " + AA_DocumentId + ", status:" + event.queryStringParameters.status + ", eventType:" + event.queryStringParameters.eventType);

    //1. check adobe document status, if document is signed, download document from adobe api
    //queryStringParameters: { eventType: 'ESIGNED', documentKey: '3AAABLblqZhCW4sqqcQsjHFltKR8zaCGvjw5sfnrGLMltx64reUz-3M8aErSF836RKr9n0L3CivwFIGRok1ZuDhBb6QWEaEDP', status: 'SIGNED' }
    if (!event.queryStringParameters.eventType || !event.queryStringParameters.status) {
        writeLog('unable to get eventType or status.');
        callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
        return;
    }

    // 2. get agreement id(document key) from callback url
    if (!event.queryStringParameters.documentKey) {
        writeLog('unable to get documentKey.');
        callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
        return;
    }
    else
    {
        agreementid = event.queryStringParameters.documentKey;
    }

    // 3. if the document doesn't complete signatures, don't need to continue. end the process.
    if (event.queryStringParameters.eventType != 'ESIGNED' || event.queryStringParameters.status != 'SIGNED') {
        writeLog('The document is not signed completely, current document status is ' + event.queryStringParameters.status);
        callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
        return;
    }

    // 4. if agency name is not in querystring.
    if (!event.queryStringParameters.agency ||  event.queryStringParameters.agency && event.queryStringParameters.agency.trim().length == 0) {
        writeLog('ageny is required');
        callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
        return;
    }
    else
    {
        agencyName = event.queryStringParameters.agency.trim();
    }

    // 5. if recordId is not in querystring.
    if (!event.queryStringParameters.recordId ||  event.queryStringParameters.recordId && event.queryStringParameters.recordId.trim().length == 0) {
        writeLog('recordId is required');
        callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
        return;
    }
    else
    {
        recordId = event.queryStringParameters.recordId.trim();
    }

    //  6. if AA documentId is not in querystring.
    if (!event.queryStringParameters.AADocumentId || event.queryStringParameters.AADocumentId && event.queryStringParameters.AADocumentId.trim().length == 0) {
        writeLog('AA DocumentId is required');
        callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
        return;
    }
    else
    {
        AA_DocumentId = event.queryStringParameters.AADocumentId.trim();
    }

    //  7. if AA RequestId is not in querystring.
    if (!event.queryStringParameters.AARequestId || event.queryStringParameters.AARequestId && event.queryStringParameters.AARequestId.trim().length == 0) {
        writeLog('AA RequestId is required');
        callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
        return;
    }
    else
    {
        AA_RequestId = event.queryStringParameters.AARequestId.trim();
    }


    createTransactionTableIfNotExists();

    // check if the requestId has been handled to avoid duplicate post due to client multiple invoke or retry
    checkAARequestIdExists(AA_RequestId,agencyName,querystring.stringify(event.queryStringParameters));

    return;

    // the AgencyStore db needs to be ready before lambda service running
    // getAgencyConfigurationByAgencyName(agencyName);

    // return;

    //====================== function =======================

    function checkAARequestIdExists(aaRequestId,agencyName,requestUrl) {
        var params = {
            TableName: ESIGN_CALLBACK_TRANSACTIONS_TABLE,
            Key: {
                AARequestId: {S: aaRequestId}
            },
            ConsistentRead: false, // optional (true | false)
            ReturnConsumedCapacity: 'NONE' // optional (NONE | TOTAL | INDEXES)
        };

        var dtBegin1 = new Date();
        dynamodb.getItem(params, function(err, data) {
            if (err)
            {
                writeLog('internal server error while retrieving data from database.');
                writeLog(err);

                callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
            }
            else // successful response
            {
                // writeLog('Get AA requestId from database:' + EOL_CHAR + JSON.stringify(data));
                writeLog("Method elapsed: " + getDiffByNow(dtBegin1) + "ms in checkAARequestIdExists() - get from db.");
                if(data.Item  && data.Item.AARequestId && data.Item.AARequestId.S)
                {
                    writeLog('Duplicate request: the same request-' + aaRequestId + ' has been processed.');
                    callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
                    return;
                }
                else
                {
                    writeLog("AARequestId-" + aaRequestId + " doesn't exist in database.");
                    // insert request id to db
                    var params = {
                        TableName:ESIGN_CALLBACK_TRANSACTIONS_TABLE,
                        Item:{
                            "AARequestId": {"S" : aaRequestId},
                            "Agency":{"S" : agencyName},
                            "requestURL":{"S" :  requestUrl},
                            "status_code":{"S" : "NA"},
                            "message":{"S" : "NA"},
                            "elapsedInMS":{"N" : "0"}
                        }
                    };

                    var dtBegin = new Date();
                    dynamodb.putItem(params, function(err, data) {
                        if (err) {
                            console.error("Unable to add transaction log to database. Error JSON:", JSON.stringify(err, null, 2));
                        } else {
                            //console.log("Added item:", JSON.stringify(data, null, 2));

                            writeLog("Method elapsed: " + getDiffByNow(dtBegin) + "ms in checkAARequestIdExists() - insert into db.");
                            // the AgencyStore db needs to be ready before lambda service running
                            getAgencyConfigurationByAgencyName(agencyName);
                        }
                        //callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
                    });
                }
            }
        });
    }

    function getAgencyConfigurationByAgencyName(agencyName) {
        var params = {
            TableName: TABLE_NAME_AGENCY_STORE,
            Key: {
                agency: {S: agencyName}
            },
            ConsistentRead: false, // optional (true | false)
            ReturnConsumedCapacity: 'NONE' // optional (NONE | TOTAL | INDEXES)
        };

        var dtBegin = new Date();
        dynamodb.getItem(params, function(err, data) {
            if (err)
            {
                transaction_message += 'Failed - getAgencyConfigurationByAgencyName.';
                updateTransactionLog(AA_RequestId,"Failed",transaction_message,0);
                writeLog('internal server error in getAgencyConfigurationByAgencyName().');
                writeLog(err);

                callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
            }
            else // successful response
            {
                writeLog('2. Get agency configuration data from database:' + EOL_CHAR + JSON.stringify(data));
                agencyStoreEntity = {
                    "agency": "",
                    "accela_refresh_token" : "",
                    "adobe_refresh_token" : "",
                    "document_counter" : 0
                };

                if(!data.Item || !data.Item.agency || !data.Item.agency.S)
                {
                    writeLog('agency is null in database, please contact administrator.');
                    transaction_message += 'Failed - getAgencyConfigurationByAgencyName.';
                    updateTransactionLog(AA_RequestId,"Failed",transaction_message,0);
                    callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
                    return;
                }
                else
                {
                    agencyStoreEntity.agency = data.Item.agency.S;
                }

                if(!data.Item || !data.Item.accela_refresh_token || !data.Item.accela_refresh_token.S || data.Item.accela_refresh_token.S.trim().length == 0)
                {
                    writeLog('accela_refresh_token is null in database, please contact administrator.');
                    transaction_message += 'Failed - read accela refresh token.';
                    updateTransactionLog(AA_RequestId,"Failed",transaction_message,0);
                    callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
                    return;
                }
                else
                {
                    agencyStoreEntity.accela_refresh_token = data.Item.accela_refresh_token.S;
                }

                if(!data.Item || !data.Item.adobe_refresh_token || !data.Item.adobe_refresh_token.S || data.Item.adobe_refresh_token.S.trim().length == 0)
                {
                    writeLog('adobe_refresh_token is null in database, please contact administrator.');
                    transaction_message += 'Failed - read adobe refresh token.';
                    updateTransactionLog(AA_RequestId,"Failed",transaction_message,0);
                    callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
                    return;
                }
                else
                {
                    agencyStoreEntity.adobe_refresh_token = data.Item.adobe_refresh_token.S;
                }

                if(!data.Item || !data.Item.document_counter || !data.Item.document_counter.N)
                {
                    writeLog('document_counter is null in database.');
                    agencyStoreEntity.document_counter = 0;
                }
                else
                {
                    agencyStoreEntity.document_counter = data.Item.document_counter.N;
                }

                writeLog("Method elapsed: " + getDiffByNow(dtBegin) + "ms in getAgencyConfigurationByAgencyName()");
                writeLog('Agency configuration data:' + EOL_CHAR + JSON.stringify(agencyStoreEntity));

                //descrept adobe and construict refresh token which are crypted in db.
                agencyStoreEntity.adobe_refresh_token = decrypt(agencyStoreEntity.adobe_refresh_token,CRYPTO_PRIVATE_KEY,CRYPYO_IV);
                agencyStoreEntity.accela_refresh_token = decrypt(agencyStoreEntity.accela_refresh_token,CRYPTO_PRIVATE_KEY,CRYPYO_IV);

                //writeLog("adobe_refresh_token: " + agencyStoreEntity.adobe_refresh_token);
                //writeLog("accela_refresh_token: " + agencyStoreEntity.accela_refresh_token);

                //callback(null, getErrorResponse(500,'internal server ok in getAgencyConfigurationByAgencyName().'))
                getAdobeAccessTokenByRefreshToken(agencyStoreEntity);
            }
        });
    }

    function getAdobeAccessTokenByRefreshToken(agencyStoreEntity) {
        var adobe_refreshtoken_body = 'grant_type=refresh_token&client_id='+ ADOBE_CLIENT_ID +'&client_secret=' + ADOBE_CLIENT_SECRET +'&refresh_token=' + agencyStoreEntity.adobe_refresh_token +'&scope=' + ADOBE_REFRESH_TOKEN_SCOPES;

        var args = {
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            data: adobe_refreshtoken_body
        };

        var dtBegin = new Date();
        var restClient = new Client();
        restClient.post(ADOBE_AUTH_API_ENDPOINT, args, function (data, response) {
            console.log("3.get adobe access token - post " + ADOBE_AUTH_API_ENDPOINT + EOL_CHAR + JSON.stringify(data));
            // console.log(data);
            if(response.statusCode != 200)
            {
                transaction_message += 'Failed - getAdobeAccessTokenByRefreshToken.'
                writeLog('Failed to get adobe access token.');
                updateTransactionLog(AA_RequestId,"Failed",transaction_message,0);
                callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
                return;
            }

            if(!data.access_token)
            {
                transaction_message += 'Failed - getAdobeAccessTokenByRefreshToken.'
                writeLog('Failed to get adobe access token.');
                updateTransactionLog(AA_RequestId,"Failed",transaction_message,0);
                callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
                return;
            }

            writeLog("Method elapsed: " + getDiffByNow(dtBegin) + "ms in getAdobeAccessTokenByRefreshToken()");

            var adobe_access_token = data.access_token;
            getDocidByAgreemnentid(adobe_access_token,agencyStoreEntity, agreementid);
        });
    }

    function getDocidByAgreemnentid(adobe_access_token,agencyStoreEntity, agreementid)
    {
        // 4. Retrieves the IDs of all the main and supporting documents of an agreement identified by agreementid
        //agreements/{agreementId}/documents
        var adobe_getDocIDs_url = ADOBE_API_ENDPOINT_BASE + '/agreements/' + agreementid + '/documents';

        var args = {
            headers: {
                "Content-Type": "application/json",
                "Access-Token": adobe_access_token
            }
        };

        var dtBegin = new Date();

        var restClient = new Client();
        restClient.get(adobe_getDocIDs_url, args, function (data, response) {
            // api response sample
            // {
            //     "documents": [
            //     {
            //         "documentId": "3AAABLblqZhA1Z4y1WdxWDDAXLROiiwKWISr7L6GyI9UC-TvKLIKZ4lUmmgNOUz5dp_L0vzAfs6gUsud3sMMw4SFROX01CcVv",
            //         "mimeType": "application/pdf",
            //         "name": "Esigh Test.pdf",
            //         "numPages": 3
            //     }
            // ]
            // }

            writeLog('4.get doc ids by agreementid - get ' + adobe_getDocIDs_url + EOL_CHAR + JSON.stringify(data));

            if(response.statusCode != 200)
            {
                transaction_message += 'Failed - getDocidByAgreemnentid.'
                writeLog('Failed to get adobe document by agreeementid.');
                updateTransactionLog(AA_RequestId,"Failed",transaction_message,0);
                callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
                return;
            }
            writeLog("Method elapsed: " + getDiffByNow(dtBegin) + "ms in getDocidByAgreemnentid()");

            var adobeDocModel;
            if(data && data.documents && data.documents.length > 0 && data.documents[0])
            {
                adobeDocModel = data.documents[0];
            }

            if(!adobeDocModel)
            {
                transaction_message += 'Failed - getDocidByAgreemnentid.'
                writeLog('Failed to get adobe document by agreeementid.');
                updateTransactionLog(AA_RequestId,"Failed",transaction_message,0);
                callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
                return;
            }
            downloadAdobeDocByDocid(adobe_access_token,agencyStoreEntity, agreementid, adobeDocModel);
        });
    }

    function  downloadAdobeDocByDocid(adobe_access_token,agencyStoreEntity, agreementid, adobeDocModel) {
        // 4. Retrieves the file stream of a document of an agreement.
        //get /agreements/{agreementId}/documents/{documentId}
        var adobe_doc_download_url = ADOBE_API_ENDPOINT_BASE + '/agreements/' + agreementid + '/documents/' + adobeDocModel.documentId;
        var args = {
            headers: {
                "Access-Token": adobe_access_token
            }
        };

        var dtBegin = new Date();

        //uploadDocToConstructCostTime =
        var restClient = new Client();
        restClient.get(adobe_doc_download_url, args, function (responsedDocContent, response) {
            // parsed response body as js object
            writeLog('5. download adobe doc by id - get ' + adobe_doc_download_url);
            //console.log('document content:' + EOL_CHAR + data);

            if(response.statusCode != 200)
            {
                transaction_message += 'Failed - downloadAdobeDocByDocid.'
                writeLog('Failed to download adobe document.');
                updateTransactionLog(AA_RequestId,"Failed",transaction_message,0);
                callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
                return;
            }

            transaction_message += 'Success - download adobe doc.'
            writeLog("Method elapsed: " + getDiffByNow(dtBegin) + "ms in downloadAdobeDocByDocid()");

            var tmpFileName = AA_RequestId + '_' + newGuid() + '.pdf';
            var localTmpFilePath = '/tmp/' + tmpFileName;

            writeLog('Signed document size:' + responsedDocContent.length)
            fs.writeFileSync(localTmpFilePath, responsedDocContent);

            incrementSignedDocCounter(agencyStoreEntity.agency);
            getConstructAccessToken(localTmpFilePath, adobeDocModel,agencyStoreEntity);
        });

    }

    function getConstructAccessToken(localTmpFilePath, adobeDocModel,agencyStoreEntity) {
        var requestBody = 'grant_type=refresh_token&client_id=' + CONSTRUCT_CLIENT_ID + '&client_secret=' + CONSTRUCT_CLIENT_SECRET + '&refresh_token=' + agencyStoreEntity.accela_refresh_token;
        //var requestBody='grant_type=refresh_token&client_id=${client_id}&client_secret=${client_secret}&refresh_token=${refresh_token}';
        var gettoken_requestUrl = CONSTRUCT_API_ENDPOINT_BASE + '/oauth2/token';

        var args = {
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            data: requestBody
        };

        var dtBegin = new Date();

        // 4. get construct access token by refresh_token
        var restClient = new Client();
        restClient.post(gettoken_requestUrl, args, function (data, response) {
            // parsed response body as js object
            writeLog('6. get construct access token - post ' + gettoken_requestUrl + EOL_CHAR + ' request body:' + requestBody + EOL_CHAR + 'response:' + JSON.stringify(data));

            if(response.statusCode != 200)
            {
                transaction_message += 'Failed - getConstructAccessToken.'
                writeLog('Failed to get construct access token.');
                updateTransactionLog(AA_RequestId,"Failed",transaction_message,0);
                callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
                return;
            }

            if(!data.access_token)
            {
                transaction_message += 'Failed - getConstructAccessToken.'
                updateTransactionLog(AA_RequestId,"Failed",transaction_message,0);
                callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
                return;
            }

            writeLog("Method elapsed: " + getDiffByNow(dtBegin) + "ms in getConstructAccessToken()");

            //console.log(data);
            var construct_access_token = data.access_token;

            // 5. upload doucumet to construct /v4/documents
            uploadEsignedDocToConstruct(construct_access_token, localTmpFilePath, adobeDocModel, agencyStoreEntity);
        });
    }

    function uploadEsignedDocToConstruct(construct_access_token, localTmpFilePath, adobeDocModel, agencyStoreEntity) {

        //console.log('in uploadEsignDocToConstruct() - access_token:' + construct_access_token);
        //api help: https://developer.accela.com/docs/api_reference/v4.post.records.recordId.documents.html
        //https://apis.accela.com/v4/records/{recordId}/documents
        //var construct_record_id = 'REC16-00000-0005N';

        // var multipart_form_data='------WebKitFormBoundaryp12wo4nWhtPpbbLq' + EOL_CHAR
        //     + 'Content-Disposition: form-data; name="uploadedFile"; filename="test3.pdf"' + EOL_CHAR
        //     + 'Content-Type: text/plain' + EOL_CHAR
        //     + EOL_CHAR
        //     + 'upload doc test' + EOL_CHAR
        //     + '------WebKitFormBoundaryp12wo4nWhtPpbbLq' + EOL_CHAR
        //     + 'Content-Disposition: form-data; name="fileInfo"; filename="fileInfo.txt"' + EOL_CHAR
        //     + 'Content-Type: text/plain' + EOL_CHAR
        //     + EOL_CHAR
        //     + '[{"serviceProviderCode": "BPTDEV","fileName": "test3.txt","type": "txt","description": "Upload txt file with file info API testing aaa"}]' + EOL_CHAR
        //     + EOL_CHAR
        //     + '------WebKitFormBoundaryp12wo4nWhtPpbbLq--';

        //console.log(multipart_form_data);
        var construct_create_doc_url = CONSTRUCT_API_ENDPOINT_BASE + '/v4/records/' + recordId + '/documents';

        //need to create a instance of Client for each invoke
        // file name needs rename to append '_SIGNED' before uploading to AA
        var newFileName = '';
        //console.log(adobeDocModel.name);
        var dotPosition = adobeDocModel.name.lastIndexOf('.');
        if(dotPosition > 0 && dotPosition < adobeDocModel.name.length - 1 )
        {
            newFileName =  adobeDocModel.name.substr(0,dotPosition) + '_SIGNED' + adobeDocModel.name.substr(dotPosition);
        }
        else
        {
            newFileName = adobeDocModel.name + '_SIGNED';
        }

        writeLog('7. Renamed file name from ' + adobeDocModel.name + ' to ' + newFileName);
        //console.log('file content length:' + adobeDocContent.length);

        var fileStream = fs.createReadStream(localTmpFilePath);
        //writeLog('tmp file in local storage:' + localTmpFilePath);
        // if (!(fileStream instanceof stream.Readable)) {
        //     console.log('fileStream is not a stream:');
        // }
        // else
        // {
        //     console.log('fileStream is  a stream:');
        // }
        var dtBegin = new Date();

        var form = new FormData();
        form.append('fileContent', fileStream, newFileName);
        //form.append('filename',newFileName)
        //form.append('fileInfo', '[{"serviceProviderCode": "' + agencyStoreEntity.agency + '","fileName": "' +  newFileName + '","type": "application/pdf","description": "SIGNED"}]');

        // put AA document seq to description so that AA can recover the original file name(original file name is a display name in AA may include special character like '\')
        form.append('fileInfo', '[{"serviceProviderCode": "' + agencyStoreEntity.agency + '","fileName": "' + newFileName + '","type": "application/pdf","description": "'  + AA_DocumentId + '"}]');
        writeLog('FormData: [{"serviceProviderCode": "' + agencyStoreEntity.agency + '","fileName": "' + newFileName + '","type": "application/pdf","description": "'  + AA_DocumentId + '"}]')
        form.submit({
            hostname: CONSTRUCT_API_HOSTNAME,
            path: '/v4/records/' + recordId + '/documents',
            protocol: CONSTRUCT_API_PROTOCOL,
            headers: {'Authorization':construct_access_token,
                //'Content-Type':'multipart/form-data;'
            }
        } , function(err, res) {
            // res – response object (http.IncomingMessage)  //
            //res.resume();

            //var allTmpFiles = getAllFilesFromFolder('/tmp');
            //writeLog('tmp files: ' + JSON.stringify(allTmpFiles));
            // delete tmp file
            fs.unlinkSync(localTmpFilePath);

            var serviceTotalElapsedTime = getDiffByNow(startTime);
            if(err)
            {
                transaction_message += 'Failed - uploadEsignedDocToConstruct.'
                updateTransactionLog(AA_RequestId,"Failed",transaction_message,serviceTotalElapsedTime);
                transaction_message = '';
                writeLog('error happens in post ' + construct_create_doc_url + EOL_CHAR + err);
                callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
            }
            else
            {
                transaction_message += 'Success - uploadEsignedDocToConstruct.'
                updateTransactionLog(AA_RequestId,"Success","Success",serviceTotalElapsedTime);
                transaction_message = '';
                //writeLog('tmp file -' + localTmpFilePath + ' has been deleted.');
                writeLog('8. response from construct api - post ' + construct_create_doc_url + EOL_CHAR + 'response header: ' + EOL_CHAR + JSON.stringify(util.inspect(res.headers)));
                writeLog("Method elapsed: " + getDiffByNow(dtBegin) + "ms in uploadEsignedDocToConstruct()");
                writeLog("Service total elapsed: " + serviceTotalElapsedTime + "ms");
                writeLog('================ adobeEsign callback function ends ================')

                callback(null, ADOBE_CALLBACK_RECEIVED_RESPONSE);
            }
        });

        return;
    }

    function incrementSignedDocCounter(agencyName) {
        var params = {
            TableName: TABLE_NAME_AGENCY_STORE,
            Key:{
                "agency": agencyName
            },
            UpdateExpression: "set document_counter = document_counter + :val",
            ExpressionAttributeValues:{
                ":val":1
            },
            ReturnValues:"UPDATED_NEW"
        };

        docClient.update(params, function(err, data) {
            if (err) {
                writeLog("Unable to update " + agencyName + " document counter. Error JSON:" + JSON.stringify(err, null, 2));
            } else {
                writeLog("Update " + agencyName + " document counter succeeded:" + JSON.stringify(data, null, 2));
            }
        });
    }

    function updateTransactionLog(aa_requestId, status, message, elapsedInMS) {
        var params = {
            TableName: ESIGN_CALLBACK_TRANSACTIONS_TABLE,
            Key:{
                "AARequestId": aa_requestId
            },
            UpdateExpression: "set status_code = :status, message = :message, elapsedInMS = :elapsedInMS",
            ExpressionAttributeValues:{
                ":status":status,
                ":message":message,
                ":elapsedInMS":elapsedInMS
            },
            ReturnValues:"UPDATED_NEW"
        };

        docClient.update(params, function(err, data) {
            if (err) {
                writeLog("Unable to update " + ESIGN_CALLBACK_TRANSACTIONS_TABLE + " table. Error JSON:" + JSON.stringify(err, null, 2));
            } else {
               writeLog("Update " + ESIGN_CALLBACK_TRANSACTIONS_TABLE + " table succeeded:" + JSON.stringify(data, null, 2));
            }
        });
    }

    function createTransactionTableIfNotExists() {
        //writeLog("Check if table: " + ESIGN_CALLBACK_TRANSACTIONS_TABLE + " exists: " + IsTableExistsOfEsignCallbackTransaction);
        if(IsTableExistsOfEsignCallbackTransaction)
        {
            return;
        }
        var params = {
            TableName: ESIGN_CALLBACK_TRANSACTIONS_TABLE
        };
        dynamodb.describeTable(params, function (err, data) {
            if (err)  // an error occurred
            {
                writeLog(err);

                if(err.code == 'ResourceNotFoundException'){
                    // table doesn't exist, create it
                    var params = {
                        TableName: ESIGN_CALLBACK_TRANSACTIONS_TABLE,
                        KeySchema: [
                            {AttributeName: "AARequestId", KeyType: "HASH"},  //Partition key
                        ],
                        AttributeDefinitions: [
                            {AttributeName: "AARequestId", AttributeType: "S"}
                        ],
                        ProvisionedThroughput: {
                            ReadCapacityUnits: 20,
                            WriteCapacityUnits: 20
                        }
                    };

                    dynamodb.createTable(params, function(err, data) {
                        if (err) {
                            writeLog(JSON.stringify(err, null, 2));
                        }
                        else
                        {
                            writeLog("create table " + ESIGN_CALLBACK_TRANSACTIONS_TABLE + "successfully.");
                            IsTableExistsOfEsignCallbackTransaction = true;
                        }
                    });
                }
            }
            else  // successful response - table exists
            {
                IsTableExistsOfEsignCallbackTransaction = true;
            }
        });
     }
}

function newGuid()
{
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

function getAllFilesFromFolder(dir) {

    var filesystem = require("fs");
    var results = [];

    filesystem.readdirSync(dir).forEach(function(file) {

        file = dir+'/'+file;
        var stat = filesystem.statSync(file);

        if (stat && stat.isDirectory()) {
            results = results.concat(_getAllFilesFromFolder(file))
        } else results.push(file);

    });

    return results;

};

function getDiffByNow(date) {
    return getDiff(date,new Date())
}

function getDiff(dt1,dt2)
{
    var dt1_ms = dt1.getTime();
    var dt2_ms = dt2.getTime();

    // Calculate the difference in milliseconds
    var difference_ms = dt2_ms - dt1_ms;
    return difference_ms;
}

function writeLog(message)
{
    console.log(message);
}

function encrypt(plaintext,key,iv){
    var key = new Buffer(key);
    var iv = new Buffer(iv ? iv : 0);
    var cipher = crypto.createCipheriv('des-cbc', key, iv);
    cipher.setAutoPadding(true)  //default true
    var ciph = cipher.update(plaintext, 'utf8', 'base64');
    ciph += cipher.final('base64');
    return ciph;
}

function decrypt(encrypt_text,key,iv){
    var key = new Buffer(key);
    var iv = new Buffer(iv ? iv : 0);
    var decipher = crypto.createDecipheriv('des-cbc', key, iv);
    decipher.setAutoPadding(true);
    var txt = decipher.update(encrypt_text, 'base64', 'utf8');
    txt += decipher.final('utf8');
    return txt;
}*/

