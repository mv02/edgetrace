#ifndef CALL_GRAPH_H
#define CALL_GRAPH_H

#include <stdlib.h>

#include "edge.h"
#include "hashtable.h"
#include "invoke.h"
#include "map.h"
#include "method.h"

typedef struct call_graph {
    char* name;
    int method_count;
    int reachable_count;
    int edge_count;
    /// Hash table of methods
    ht* methods;
    /// Linked list of invokes
    invoke_t* invokes;
    /// Linked list of edges
    edge_t* edges;
    struct call_graph* other_graph;
} call_graph_t;

call_graph_t* call_graph_create(char* dirname, char* name);
void call_graph_destroy(call_graph_t* cg);
void call_graph_print(call_graph_t* cg);

void purge_common_edges(call_graph_t* cg);
void link_equivalents(call_graph_t* cg1, call_graph_t* cg2);
void print_top_edges(call_graph_t* cg, int n);

#endif
