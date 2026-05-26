from app.integrations.neo4j_client import neo4j_integration
try:
    neo4j_integration.run_query("CALL apoc.help('apoc')")
    print('SUCCESS')
except Exception as e:
    print('ERROR:', e)
