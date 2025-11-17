import os
import logging
import json
import re
import sqlalchemy
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError
from ..utils.logging_utils import setup_logger
from typing import Dict, List, Any, Optional, Union, Tuple

# Configure logger
logger = setup_logger('database_service')

class DatabaseConnection:
    """Class to manage a database connection."""
    def __init__(self, connection_id: str, connection_string: str, name: str = None):
        self.connection_id = connection_id
        self.connection_string = connection_string
        self.name = name or f"Connection {connection_id}"
        self.engine = None
        self.inspector = None
        
    def get_engine(self):
        """Get or create a database engine."""
        if not self.engine:
            try:
                self.engine = create_engine(self.connection_string)
                self.inspector = inspect(self.engine)
                logger.info(f"Database engine created for connection {self.connection_id}")
            except Exception as e:
                logger.error(f"Failed to create database engine for connection {self.connection_id}: {str(e)}")
                raise
        return self.engine
        
    def test_connection(self) -> bool:
        """Test if the connection is valid."""
        try:
            engine = self.get_engine()
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Connection test failed for {self.connection_id}: {str(e)}")
            return False

class DatabaseService:
    def __init__(self):
        """Initialize the database service without creating any default connections.
        Connections must be explicitly added using add_connection().
        """
        self.connections: Dict[str, DatabaseConnection] = {}
        logger.info("Initializing DatabaseService without default connection")
        
    def add_connection(self, connection_id: str, connection_string: str, name: str = None) -> bool:
        """Add a new database connection.
        
        Args:
            connection_id: Unique identifier for the connection
            connection_string: SQLAlchemy connection string
            name: Human-readable name for the connection
            
        Returns:
            Boolean indicating success
        """
        try:
            connection = DatabaseConnection(connection_id, connection_string, name)
            if connection.test_connection():
                self.connections[connection_id] = connection
                logger.info(f"Added connection {connection_id} ({name})")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to add connection {connection_id}: {str(e)}")
            return False
            
    def remove_connection(self, connection_id: str) -> bool:
        """Remove a database connection.
        
        Args:
            connection_id: ID of the connection to remove
            
        Returns:
            Boolean indicating success
        """
        if connection_id in self.connections:
            del self.connections[connection_id]
            logger.info(f"Removed connection {connection_id}")
            return True
        return False
        
    def get_connection(self, connection_id: str = 'default') -> Optional[DatabaseConnection]:
        """Get a database connection by ID.
        
        Args:
            connection_id: ID of the connection to get
            
        Returns:
            DatabaseConnection object or None if not found
        """
        return self.connections.get(connection_id)
        
    def list_connections(self) -> List[Dict[str, str]]:
        """List all available connections.
        
        Returns:
            List of connection details
        """
        return [
            {
                'id': conn_id,
                'name': conn.name,
                'connection_string': conn.connection_string
            }
            for conn_id, conn in self.connections.items()
        ]
        
    def execute_query(self, query: str, params: Dict = None, connection_id: str = 'default') -> Union[List[Dict], Dict]:
        """Execute a SQL query and return the results.
        
        Args:
            query: SQL query string
            params: Optional parameters for the query
            connection_id: ID of the connection to use
            
        Returns:
            List of dictionaries containing the query results or error dict
        """
        connection = self.get_connection(connection_id)
        if not connection:
            return {"error": f"Connection {connection_id} not found"}
            
        engine = connection.get_engine()
        
        try:
            logger.info(f"Executing query on connection {connection_id}: {query[:100]}{'...' if len(query) > 100 else ''}")
            with engine.connect() as conn:
                result = conn.execute(text(query), params or {})
                
                # Convert result to list of dictionaries
                columns = result.keys()
                rows = []
                for row in result:
                    rows.append(dict(zip(columns, row)))
                
                logger.info(f"Query executed successfully, returned {len(rows)} rows")
                return rows
        except SQLAlchemyError as e:
            error_msg = str(e)
            logger.error(f"Query execution failed: {error_msg}")
            return {"error": error_msg}
            
    def get_table_schema(self, table_name: str, connection_id: str = 'default') -> Dict:
        """Get the schema for a specific table.
        
        Args:
            table_name: Name of the table
            connection_id: ID of the connection to use
            
        Returns:
            Dictionary containing table schema information
        """
        connection = self.get_connection(connection_id)
        if not connection:
            return {"error": f"Connection {connection_id} not found"}
            
        try:
            logger.info(f"Getting schema for table: {table_name} on connection {connection_id}")
            inspector = connection.inspector or inspect(connection.get_engine())
            
            # Check if table exists
            if table_name not in inspector.get_table_names():
                return {"error": f"Table {table_name} not found"}
                
            # Get column information
            columns = []
            for column in inspector.get_columns(table_name):
                columns.append({
                    "name": column["name"],
                    "type": str(column["type"]),
                    "nullable": column.get("nullable", True)
                })
                
            # Get primary key information
            pk_columns = inspector.get_pk_constraint(table_name).get("constrained_columns", [])
            
            # Get foreign key information
            foreign_keys = []
            for fk in inspector.get_foreign_keys(table_name):
                foreign_keys.append({
                    "column": fk["constrained_columns"],
                    "references": {
                        "table": fk["referred_table"],
                        "column": fk["referred_columns"]
                    }
                })
                
            logger.info(f"Retrieved schema for table {table_name} with {len(columns)} columns")
            return {
                "table_name": table_name,
                "columns": columns,
                "primary_keys": pk_columns,
                "foreign_keys": foreign_keys
            }
        except Exception as e:
            logger.error(f"Failed to get table schema: {str(e)}")
            return {"error": str(e)}
            
    def list_tables(self, connection_id: str = 'default') -> Union[List[str], Dict]:
        """List all tables in the database.
        
        Args:
            connection_id: ID of the connection to use
            
        Returns:
            List of table names or error dict
        """
        connection = self.get_connection(connection_id)
        if not connection:
            return {"error": f"Connection {connection_id} not found"}
            
        try:
            logger.info(f"Listing all tables in database on connection {connection_id}")
            inspector = connection.inspector or inspect(connection.get_engine())
            tables = inspector.get_table_names()
            logger.info(f"Found {len(tables)} tables in database")
            return tables
        except Exception as e:
            logger.error(f"Failed to list tables: {str(e)}")
            return {"error": str(e)}
            
    def get_table_sample(self, table_name: str, limit: int = 5, connection_id: str = 'default') -> Union[List[Dict], Dict]:
        """Get a sample of data from a table.
        
        Args:
            table_name: Name of the table
            limit: Maximum number of rows to return
            connection_id: ID of the connection to use
            
        Returns:
            List of sample rows or error dict
        """
        try:
            query = f"SELECT * FROM {table_name} LIMIT {limit}"
            return self.execute_query(query, connection_id=connection_id)
        except Exception as e:
            logger.error(f"Failed to get table sample: {str(e)}")
            return {"error": str(e)}
            
    def get_table_count(self, table_name: str, connection_id: str = 'default') -> Union[int, Dict]:
        """Get the number of rows in a table.
        
        Args:
            table_name: Name of the table
            connection_id: ID of the connection to use
            
        Returns:
            Row count or error dict
        """
        try:
            query = f"SELECT COUNT(*) as count FROM {table_name}"
            result = self.execute_query(query, connection_id=connection_id)
            if isinstance(result, list) and len(result) > 0:
                return result[0].get("count", 0)
            return 0
        except Exception as e:
            logger.error(f"Failed to get table count: {str(e)}")
            return {"error": str(e)}
    
    def _extract_table_name(self, query_text: str) -> Optional[str]:
        """Extract table name from a natural language query.
        
        Args:
            query_text: Natural language query
            
        Returns:
            Table name or None if not found
        """
        # Common patterns for table name extraction
        patterns = [
            r"table\s+([\w_]+)",  # table users
            r"from\s+([\w_]+)",   # from users
            r"in\s+([\w_]+)"      # in users
        ]
        
        for pattern in patterns:
            match = re.search(pattern, query_text.lower())
            if match:
                return match.group(1)
                
        return None
        
    def _extract_connection_id(self, query_text: str) -> str:
        """Extract connection ID from a natural language query.
        
        Args:
            query_text: Natural language query
            
        Returns:
            Connection ID or 'default' if not found
        """
        # Pattern for connection specification
        match = re.search(r"connection\s+([\w_-]+)", query_text.lower())
        if match:
            conn_id = match.group(1)
            if conn_id in self.connections:
                return conn_id
                
        return 'default'
        
    def _nl_to_sql(self, query_text: str) -> Tuple[str, Dict]:
        """Convert natural language to SQL query.
        
        Args:
            query_text: Natural language query
            
        Returns:
            Tuple of (SQL query, parameters)
        """
        query_lower = query_text.lower()
        
        # Extract key information
        table_name = self._extract_table_name(query_lower)
        if not table_name:
            raise ValueError("Could not identify table name in query")
            
        # Count pattern
        if re.search(r"how many|count", query_lower):
            return f"SELECT COUNT(*) as count FROM {table_name}", {}
            
        # Limit pattern
        limit_match = re.search(r"(top|first|limit)\s+(\d+)", query_lower)
        limit = int(limit_match.group(2)) if limit_match else 10
        
        # Filter pattern
        where_clause = ""
        params = {}
        
        # Common filter patterns
        filter_patterns = [
            # column = value
            (r"where\s+([\w_]+)\s+(?:is|=|equals?)\s+['\"]?([\w\s]+)['\"]?", "="),
            # column > value
            (r"where\s+([\w_]+)\s+(?:>|greater than)\s+([\d.]+)", ">"),
            # column < value
            (r"where\s+([\w_]+)\s+(?:<|less than)\s+([\d.]+)", "<"),
            # column like value
            (r"where\s+([\w_]+)\s+(?:like|contains)\s+['\"]?([\w\s%]+)['\"]?", "LIKE"),
        ]
        
        for pattern, operator in filter_patterns:
            match = re.search(pattern, query_lower)
            if match:
                column, value = match.groups()
                param_name = f"p_{column}"
                
                # Special case for LIKE operator
                if operator == "LIKE" and "%" not in value:
                    value = f"%{value}%"
                    
                where_clause = f"WHERE {column} {operator} :{param_name}"
                params[param_name] = value
                break
                
        # Order by pattern
        order_clause = ""
        order_match = re.search(r"order by\s+([\w_]+)\s+(asc|desc)", query_lower)
        if order_match:
            column, direction = order_match.groups()
            order_clause = f"ORDER BY {column} {direction.upper()}"
        
        # Build the final query
        sql = f"SELECT * FROM {table_name} {where_clause} {order_clause} LIMIT {limit}"
        return sql.strip(), params
    
    def execute_database_tool(self, query_text: str, connection_id: str = None) -> Dict:
        """Execute a natural language query as a database tool.
        
        This function parses a natural language query and attempts to convert it
        to a SQL query, then executes it against the database.
        
        Args:
            query_text: Natural language query text
            connection_id: Optional connection ID to use
            
        Returns:
            Dictionary containing query results or error message
        """
        logger.info(f"Processing database tool query: {query_text}")
        
        # Extract connection ID from query if not provided
        if not connection_id:
            connection_id = self._extract_connection_id(query_text)
            
        # For simple queries, we can use pattern matching
        query_lower = query_text.lower().strip()
        
        try:
            # Connection management
            if "list connections" in query_lower or "show connections" in query_lower:
                connections = self.list_connections()
                return {
                    "result_type": "connections",
                    "connections": connections,
                    "message": f"Found {len(connections)} database connections."
                }
                
            # List tables query - handle various formats
            if query_lower in ["list tables", "show tables", "list_tables", "tables"]:
                tables = self.list_tables(connection_id)
                if isinstance(tables, dict) and "error" in tables:
                    return tables
                    
                return {
                    "result_type": "tables",
                    "tables": tables,
                    "message": f"Found {len(tables)} tables in the database."
                }
                
            # Describe table query - handle various formats
            describe_match = re.match(r"^(?:describe|desc)\s+([\w_]+)$", query_lower)
            if describe_match:
                table_name = describe_match.group(1)
                schema = self.get_table_schema(table_name, connection_id)
                
                if isinstance(schema, dict) and "error" in schema:
                    return schema
                    
                return {
                    "result_type": "schema",
                    "schema": schema,
                    "message": f"Retrieved schema for table {table_name}."
                }
                
            # Table schema query
            elif re.search(r"schema|structure|columns", query_lower):
                table_name = self._extract_table_name(query_lower)
                if not table_name:
                    return {
                        "error": "Could not identify table name in query. Try 'DESCRIBE table_name' or 'schema of table_name'."
                    }
                    
                schema = self.get_table_schema(table_name, connection_id)
                
                if isinstance(schema, dict) and "error" in schema:
                    return schema
                    
                return {
                    "result_type": "schema",
                    "schema": schema,
                    "message": f"Retrieved schema for table {table_name}."
                }
                
            # Table sample query
            elif re.search(r"sample|example|preview", query_lower):
                table_name = self._extract_table_name(query_lower)
                if not table_name:
                    return {
                        "error": "Could not identify table name in query. Try 'sample from table_name'."
                    }
                    
                # Extract limit if specified
                limit_match = re.search(r"(\d+)\s+rows", query_lower)
                limit = int(limit_match.group(1)) if limit_match else 5
                
                sample = self.get_table_sample(table_name, limit, connection_id)
                
                if isinstance(sample, dict) and "error" in sample:
                    return sample
                    
                return {
                    "result_type": "query_results",
                    "results": sample,
                    "message": f"Sample data from table {table_name} (showing {len(sample)} rows)."
                }
                
            # Count query
            elif re.search(r"count|how many", query_lower):
                table_name = self._extract_table_name(query_lower)
                if not table_name:
                    return {
                        "error": "Could not identify table name in query. Try 'count rows in table_name'."
                    }
                    
                count = self.get_table_count(table_name, connection_id)
                
                if isinstance(count, dict) and "error" in count:
                    return count
                    
                return {
                    "result_type": "count",
                    "count": count,
                    "message": f"Table {table_name} has {count} rows."
                }
                
            # Direct SQL query
            elif query_lower.startswith("sql:"):
                sql_query = query_text[4:].strip()  # Remove "sql:" prefix
                results = self.execute_query(sql_query, connection_id=connection_id)
                
                if isinstance(results, dict) and "error" in results:
                    return results
                    
                return {
                    "result_type": "query_results",
                    "results": results,
                    "message": f"Query executed successfully. Returned {len(results)} rows."
                }
                
            # Handle SELECT queries directly
            elif query_lower.startswith("select "):
                results = self.execute_query(query_text, connection_id=connection_id)
                
                if isinstance(results, dict) and "error" in results:
                    return results
                    
                return {
                    "result_type": "query_results",
                    "results": results,
                    "message": f"Query executed successfully. Returned {len(results)} rows."
                }
                
            # Try NL to SQL conversion
            else:
                try:
                    sql_query, params = self._nl_to_sql(query_text)
                    logger.info(f"Converted NL to SQL: {sql_query} with params {params}")
                    
                    results = self.execute_query(sql_query, params, connection_id)
                    
                    if isinstance(results, dict) and "error" in results:
                        return results
                        
                    return {
                        "result_type": "query_results",
                        "results": results,
                        "sql": sql_query,  # Include the generated SQL for reference
                        "message": f"Query executed successfully. Returned {len(results)} rows."
                    }
                except ValueError as e:
                    return {
                        "error": str(e),
                        "suggestion": "Try using 'SQL:' prefix followed by a SQL query, or use one of these formats: 'SHOW TABLES', 'DESCRIBE table_name', 'SELECT * FROM table_name WHERE year = 2016'"
                    }
                
        except Exception as e:
            logger.error(f"Database tool execution failed: {str(e)}")
            return {"error": f"Database tool error: {str(e)}"}
