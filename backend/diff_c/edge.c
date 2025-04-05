#include <stdio.h>
#include <stdlib.h>

#include "edge.h"
#include "method.h"

edge_t* edge_create(method_t* source, method_t* target, bool is_spurious, int id)
{
    edge_t* edge = malloc(sizeof(edge_t));
    if (edge == NULL) {
        return NULL;
    }

    edge->id = id;
    edge->source = source;
    edge->target = target;
    edge->is_spurious = is_spurious;
    edge->value = 0;
    edge->next = NULL;

    return edge;
}

void edge_destroy(edge_t* edge) { free(edge); }

char* edge_key(int source_id, int target_id)
{
    char* buf = malloc(22); // ID:ID\0
    snprintf(buf, 22, "%u:%u", source_id, target_id);
    return buf;
}

void edge_print(edge_t* edge)
{
    printf("[%.4g] ", edge->value);
    method_print_short(edge->source);
    printf(" -> ");
    method_print_short(edge->target);
    printf("\n");
}

void edge_print_cypher(edge_t* edge, int depth)
{
    if (depth > 0) {
        printf("MATCH (m1:Method {Type: '%s', Name: '%s', Parameters: '%s', Return: '%s'})\n"
               "-[:CALLS]->(m2:Method {Type: '%s', Name: '%s', Parameters: '%s', Return: '%s'})\n"
               "MATCH path = (m2)-[:CALLS]->{0,%d}(:Method {PresentInOther: 'false'})\n"
               "WHERE ALL(m IN nodes(path) WHERE m.PresentInOther = 'false')\n"
               "RETURN m1, m2, path\n",
               edge->source->declared_type, edge->source->name, edge->source->params,
               edge->source->return_type, edge->target->declared_type, edge->target->name,
               edge->target->params, edge->target->return_type, depth);
    } else {
        printf("MATCH (m1:Method {Type: '%s', Name: '%s', Parameters: '%s', Return: '%s'})\n"
               "-[:CALLS]->(m2:Method {Type: '%s', Name: '%s', Parameters: '%s', Return: '%s'})\n"
               "RETURN m1, m2\n",
               edge->source->declared_type, edge->source->name, edge->source->params,
               edge->source->return_type, edge->target->declared_type, edge->target->name,
               edge->target->params, edge->target->return_type);
    }
}
