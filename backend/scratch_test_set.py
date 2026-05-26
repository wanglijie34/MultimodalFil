from app.integrations.neo4j_client import neo4j_integration
try:
    neo4j_integration.run_query("""
    MERGE (e:Entity {name: 'TestEntity'})
    SET e += $attributes
    RETURN e
    """, {"attributes": {"test1": "value1", "test2": "value2"}})
    print('SUCCESS')
except Exception as e:
    print('ERROR:', e)
