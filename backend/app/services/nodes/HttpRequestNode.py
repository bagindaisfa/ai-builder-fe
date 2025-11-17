### this class for http request node
### retrun the response of http request
### 

import requests
import json
import os
from pathlib import Path
from app.utils.logging_utils import setup_logger

# Configure logger
logger = setup_logger('Http_Request_Node_Execution')
class HttpRequestNode:
    def __init__(self, node_id, node_data, context):
        self.node_id = node_id
        self.node_data = node_data
        self.url = node_data.get('url', '')
        self.method = node_data.get('method', 'GET')
        self.headers = node_data.get('headers', [])
        self.params = node_data.get('params', [])
        self.bodyType = node_data.get('bodyType', '')
        self.bodyData = node_data.get('bodyData', '')
        self.context = context

    def execute(self):
        #Get URL
        url = self.node_data.get('url', '')
        
        # Helper function to replace variables in text
        import re
        def replace_variables(text):
            if not text or not isinstance(text, str):
                return text
                
            def replace_var(match):
                var_ref = match.group(1).strip()
                try:
                    node_id, var_name = var_ref.split('.')
                    
                    # Find the referenced node in process steps
                    for step in self.context.get('process_steps', []):
                        if step['node'] == node_id:
                            # Handle input/output variables
                            if var_name in ['input', 'output']:
                                value = step.get(var_name)
                                if value is not None:
                                    logger.info(f"Found variable {node_id}.{var_name} = {str(value)[:50]}...")
                                    return str(value)
                except Exception as e:
                    logger.error(f"Error replacing variable {var_ref}: {str(e)}")
                    
                logger.info(f"Variable {var_ref} not found or invalid")
                return f"{{{{{var_ref}}}}}"
            
            # Replace all variable references
            return re.sub(r'\{\{\s*([^}]+?)\s*\}\}', replace_var, text)
        
        # Replace variables in URL
        if '{{' in url:
            logger.info(f"URL before variable replacement: {url}")
            url = replace_variables(url)
            logger.info(f"URL after variable replacement: {url}")
        
        #Get Method
        method = self.node_data.get('method', 'GET')
        
        #Get Headers
        headers = self.node_data.get('headers', [])
        
        #construct the headers from [{"key1", "value1"}, {"key2", "value2"}, ...] to {"key1": "value1", "key2": "value2", ...}
        headersURL = None
        if headers:
            headersURL = {}
            for header in headers:
                key = header['key']
                value = header['value']
                
                # Replace variables in header value if needed
                if isinstance(value, str) and '{{' in value:
                    logger.info(f"Header value before variable replacement for key '{key}': {value}")
                    value = replace_variables(value)
                    logger.info(f"Header value after variable replacement for key '{key}': {value}")
                
                headersURL[key] = value

        #check is there json application in header
        isJsonContentType = False
        for header in headers:
            if header['key'] == 'Content-Type' and header['value'] == 'application/json':
                isJsonContentType = True

        #check if is params empty then construct params from [{"key1", "value1"}, {"key2", "value2"}, ...] to "key1=value1&key2=value2"
        params = self.node_data.get('params', [])
        paramsURL = None
        if params:
            # Process each param and replace variables in values
            processed_params = []
            for param in params:
                key = param['key']
                value = param['value']
                
                # Replace variables in param value if needed
                if isinstance(value, str) and '{{' in value:
                    logger.info(f"Param value before variable replacement for key '{key}': {value}")
                    value = replace_variables(value)
                    logger.info(f"Param value after variable replacement for key '{key}': {value}")
                
                processed_params.append(f"{key}={value}")
            
            paramsURL = '&'.join(processed_params)

        #Get Body
        bodyType = self.node_data.get('bodyType', '')
        bodyData = None

        response = None

        try:
            
            match bodyType:
                case 'raw':
                    bodyData = self.node_data.get('bodyData', '')
                    # Replace variables in raw body data
                    if isinstance(bodyData, str) and '{{' in bodyData:
                        logger.info(f"Raw body before variable replacement: {bodyData[:100]}{'...' if len(bodyData) > 100 else ''}")
                        bodyData = replace_variables(bodyData)
                        logger.info(f"Raw body after variable replacement: {bodyData[:100]}{'...' if len(bodyData) > 100 else ''}")
                    response = requests.request(method, url, headers=headersURL, params=paramsURL, data=bodyData)
                case 'form-data':
                    # Initialize files dictionary for file uploads
                    files = []
                    form_data = {}
                    
                    # Process each body item
                    for body in self.node_data.get('bodyData', []):
                        if body['type'] == 'text':
                            form_data[body['key']] = body['value']
                        else:
                            # Handle file uploads
                            if self.context.get('files'):
                                for file in self.context.get('files'):
                                    if file.get('path') and os.path.exists(file['path']):
                                        file_path = file['path']
                                        file_name = Path(file_path).name
                                        # Use a tuple with (filename, fileobj, content_type)
                                        logger.info(f"Adding file: {file_name}, key : {body['key']}")
                                        files.append((body['key'], (
                                            file_name, 
                                            open(file_path, 'rb'),
                                            file.get('mime_type')  # or get the actual content type
                                        )))
                                        logger.info(f"Preparing to upload file: {file_name}")
                    
                    try:
                        # Make the request with both form data and files
                        if files:
                            logger.info("Sending request with files and form data")
                            # When using files, requests will set the Content-Type to multipart/form-data
                            response = requests.request(
                                method, 
                                url, 
                                headers=headersURL, 
                                params=paramsURL,
                                data=form_data,  # Regular form fields
                                files=files      # Files to upload
                            )
                        else:
                            # If no files, just send form data as x-www-form-urlencoded
                            logger.info("Sending request with form data only")
                            headers = headersURL or {}
                            if 'Content-Type' not in headers:
                                headers['Content-Type'] = 'application/x-www-form-urlencoded'
                                
                            response = requests.request(
                                method, 
                                url, 
                                headers=headers, 
                                params=paramsURL,
                                data=form_data
                            )
                            
                    except Exception as e:
                        logger.error(f"Error making request: {str(e)}")
                        raise
                    finally:
                        # Close all file handles
                        for file_list in files:
                            if isinstance(file_list, tuple) and len(file_list) > 1:
                                file_obj = file_list[1]
                                if hasattr(file_obj, 'close'):
                                    file_obj.close()

                case 'x-www-form-urlencoded':
                    if self.node_data.get('bodyData', []):
                        # Create a dictionary with form data, replacing variables in values
                        bodyData = {}
                        for form in self.node_data.get('bodyData', []):
                            key = form['key']
                            value = form['value']
                            
                            # Replace variables in value if needed
                            if isinstance(value, str) and '{{' in value:
                                logger.info(f"Form value before variable replacement for key '{key}': {value[:100]}{'...' if len(value) > 100 else ''}")
                                value = replace_variables(value)
                                logger.info(f"Form value after variable replacement for key '{key}': {value[:100]}{'...' if len(value) > 100 else ''}")
                            
                            bodyData[key] = value

                    response = requests.request(method, url, headers=headersURL, params=paramsURL, data=bodyData)
                case 'binary':
                    #TO DO
                    bodyContent = self.node_data.get('bodyData', '')
                    response = requests.request(method, url, headers=headersURL, params=paramsURL, data=bodyContent)
                case 'json':
                    bodyData = self.node_data.get('bodyData', '{}')
                    # Replace variables in JSON body data
                    if isinstance(bodyData, str) and '{{' in bodyData:
                        logger.info(f"JSON body before variable replacement: {bodyData[:100]}{'...' if len(bodyData) > 100 else ''}")
                        bodyData = replace_variables(bodyData)
                        logger.info(f"JSON body after variable replacement: {bodyData[:100]}{'...' if len(bodyData) > 100 else ''}")
                    
                    # Parse the JSON string to a Python object
                    try:
                        json_data = json.loads(bodyData)
                        response = requests.request(method, url, headers=headersURL, params=paramsURL, json=json_data)
                    except json.JSONDecodeError as e:
                        logger.error(f"Invalid JSON format: {str(e)}")
                        # Fall back to sending as raw data if JSON parsing fails
                        response = requests.request(method, url, headers=headersURL, params=paramsURL, data=bodyData)
                case 'none':
                    
                    response = requests.request(method, url, headers=headersURL, params=paramsURL)

                case _:
                    bodyContent = ""
                    response = requests.request(method, url, headers=headersURL, params=paramsURL)
        except Exception as e:
            logger.error(f"Failed to execute HTTP Request node {self.node_id}: {str(e)}")
            raise e

        result = None
        if response.status_code != requests.codes.ok and response.status_code != requests.codes.created :
            result = response.text
        else:
            result = {
                    "status": response.status_code,
                    "body": response.json(),
                    "headers": str(response.headers),
                    "files": []
                }
            
            if not isJsonContentType:
                result = str(result)
        return result
